"""Fill the database with DEMO results so the dashboard can be built and reviewed.

Every number here is made up. The run is stored with is_demo=True and the dashboard
shows a banner while a demo run is selected. Real runs come from publish.py.
"""

import json
import math
import random
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import metrics
from .categories import BY_ID
from .db import Base, engine
from .tables import Ablation, ChecklistCell, Model, ModelLoad, Prediction, Run, Sample, Stage

DATA = Path(__file__).parent / "data"
DEMO_RUN_ID = "demo-2026-10-22"
PROMPT = "Extract all text from this image."

# How good each model is per category in the demo (0 = useless, 1 = perfect).
SKILL = {
    "pp_ocrv6_m": {"handwritten_text": 0.78, "printed_text": 0.97, "diagram_labels": 0.70},
    "pp_ocrv5_server": {"handwritten_text": 0.72, "printed_text": 0.96, "diagram_labels": 0.66},
    "pp_ocrv5_devanagari": {"hindi": 0.85, "printed_text": 0.90},
    "pp_structurev3": {"handwritten_text": 0.74, "printed_text": 0.97, "printed_formula": 0.85, "handwritten_formula": 0.45,
                       "tables": 0.80, "diagram_labels": 0.62},
    "paddleocr_vl_1_6": {"handwritten_text": 0.88, "printed_text": 0.98, "printed_formula": 0.92, "handwritten_formula": 0.62,
                         "tables": 0.86, "diagram_labels": 0.74, "hindi": 0.80},
    "paddleocr_vl_1_5": {"handwritten_text": 0.85, "printed_text": 0.98, "printed_formula": 0.90, "handwritten_formula": 0.55,
                         "tables": 0.84, "diagram_labels": 0.70, "hindi": 0.78},
    "pp_formulanet_plus_l": {"printed_formula": 0.93, "handwritten_formula": 0.50},
    "qwen3_vl_8b": {"handwritten_text": 0.90, "printed_text": 0.97, "printed_formula": 0.88, "handwritten_formula": 0.70,
                    "tables": 0.82, "diagram_labels": 0.84, "hindi": 0.86},
    "glm_ocr": {"handwritten_text": 0.89, "printed_text": 0.99, "printed_formula": 0.94, "handwritten_formula": 0.66,
                "tables": 0.90, "diagram_labels": 0.76},
    "uni_mumer": {"handwritten_formula": 0.86, "printed_formula": 0.90},
    "decimer": {"chemistry": 0.75},
    "pp_doclayoutv3": {},
    "mineru_2_5_pro": {"handwritten_text": 0.70, "printed_text": 0.98, "printed_formula": 0.93, "handwritten_formula": 0.52,
                       "tables": 0.88, "diagram_labels": 0.72},
    "typhoon_ocr_1_5_2b": {"handwritten_text": 0.84, "printed_text": 0.96, "printed_formula": 0.84, "handwritten_formula": 0.58,
                           "tables": 0.84, "diagram_labels": 0.74},
}

# Median seconds per sample and peak memory (MB) in the demo.
SPEED = {
    "pp_ocrv6_m": (0.9, 1400), "pp_ocrv5_server": (1.4, 1900), "pp_ocrv5_devanagari": (0.5, 900),
    "pp_structurev3": (6.5, 5200), "paddleocr_vl_1_6": (14.0, 6100), "paddleocr_vl_1_5": (15.2, 6000),
    "pp_formulanet_plus_l": (2.2, 2600), "qwen3_vl_8b": (4.2, 9800), "glm_ocr": (1.8, 4300),
    "uni_mumer": (2.5, 7200), "decimer": (0.9, 2100),
    "pp_doclayoutv3": (0.7, 1200), "mineru_2_5_pro": (2.4, 4800), "typhoon_ocr_1_5_2b": (3.1, 5600),
}
WEIGHTS_MB = {
    "pp_ocrv6_m": 180, "pp_ocrv5_server": 210, "pp_ocrv5_devanagari": 25, "pp_structurev3": 1300,
    "paddleocr_vl_1_6": 1900, "paddleocr_vl_1_5": 1900, "pp_formulanet_plus_l": 700, "qwen3_vl_8b": 16500,
    "glm_ocr": 2100, "uni_mumer": 7000, "decimer": 600,
    "pp_doclayoutv3": 130, "mineru_2_5_pro": 2400, "typhoon_ocr_1_5_2b": 4300,
}

CONFUSE = {"l": "1", "1": "l", "O": "0", "0": "O", "e": "c", "a": "o", "m": "rn", "s": "5", "g": "q", "u": "v", "t": "f",
           "n": "h", "h": "b", "i": "j", "=": "-", "x": "×", "^": "", ".": ",", ",": "."}

LATEX_SLIPS = [
    lambda s: s.replace("^{2}", "^{z}", 1),
    lambda s: s.replace(r"\frac", "", 1),
    lambda s: s.replace("=", "-", 1),
    lambda s: s.replace("m_{1}", "m_{l}", 1),
    lambda s: s.replace(r"\lambda", r"\Lambda", 1),
    lambda s: s + "}",
]


def corrupt_text(rng: random.Random, text: str, quality: float) -> str:
    p = (1 - quality) * 0.35
    out = []
    for ch in text:
        r = rng.random()
        if r < p * 0.55 and ch in CONFUSE:
            out.append(CONFUSE[ch])
        elif r < p * 0.75:
            continue
        elif r < p * 0.8:
            out.append(ch + ch)
        else:
            out.append(ch)
    return "".join(out)


def predict(rng: random.Random, model_id: str, sample: Sample, quality: float, config: str) -> str:
    gt = sample.ground_truth
    if sample.gt_kind == "latex":
        if rng.random() < quality:
            return gt["latex"]
        return rng.choice(LATEX_SLIPS)(gt["latex"])
    if sample.gt_kind == "smiles":
        if rng.random() < quality:
            return gt["smiles"]
        return rng.choice([gt["smiles"] + "C", gt["smiles"].replace("O", "N"), "c1ccccc1"])
    text = corrupt_text(rng, gt["text"], quality)
    # A prompted VLM sometimes adds commentary instead of only transcribing (raw behaviour, PIPELINE rule 12).
    if model_id == "qwen3_vl_8b" and rng.random() < 0.25:
        text += "\n\nThis appears to be a student's handwritten answer."
    return text


def stage_relevance(model: Model) -> set[str]:
    rel: set[str] = {"F01", "F06", "T01", "T10", "O01", "R01", "R02", "R03", "D04"}
    for cat in model.covers:
        rel.update(BY_ID[cat].stage_ids)
    steps = {s["id"] for s in model.pipeline}
    if steps & {"doc_ori", "doc_pre"}:
        rel.update({"P02"})
    if steps & {"unwarp", "doc_pre"}:
        rel.update({"P04", "P05"})
    if "textline_ori" in steps:
        rel.add("T02")
    if "layout" in steps:
        rel.update({"L01", "L02", "L03", "L04", "X09", "O02"})
    if "table" in steps:
        rel.update({"X06", "L09"})
    if "chart" in steps:
        rel.add("X07")
    if "seal" in steps:
        rel.add("T14")
    if model.kind == "vlm":
        rel.update({"F02", "F05", "L03", "L07", "X03", "X10", "O02"})
    if model.platform == "M4 CPU":
        rel.add("D01")
    if model.license == "Apache-2.0":
        rel.add("D05")
    return rel


def load_static(session: Session) -> None:
    stages = json.loads((DATA / "stages.json").read_text())["stages"]
    for s in stages:
        session.merge(Stage(**s))
    for m in json.loads((DATA / "models.json").read_text()):
        session.merge(Model(**m))
    for s in json.loads((DATA / "demo_samples.json").read_text()):
        s = dict(s)
        s.pop("lines")
        s["image_url"] = f"/api/media/demo/{s.pop('image_file')}"
        session.merge(Sample(**s))
    session.flush()


def seed_demo(session: Session) -> None:
    rng = random.Random(2026)
    load_static(session)
    sample_lines = {s["id"]: s["lines"] for s in json.loads((DATA / "demo_samples.json").read_text())}

    session.add(Run(
        id=DEMO_RUN_ID, created_at=datetime(2026, 10, 22, 18, 0), is_demo=True, git_commit="demo",
        manifest_sha256="demo", thresholds_sha256="demo", prompt=PROMPT,
        machines={"M4 CPU": "Apple M4, 16 GB RAM, CPU inference", "Colab T4": "NVIDIA T4 16 GB, float16 (no bfloat16 on T4)"},
        notes="Demo data. Made-up numbers to build and review the dashboard. No model has been run yet.",
    ))

    models = session.scalars(select(Model)).all()
    samples = session.scalars(select(Sample)).all()
    stages = session.scalars(select(Stage)).all()

    for model in models:
        if model.status == "pending":
            continue
        base_s, base_mem = SPEED[model.id]
        optional = [s for s in model.pipeline if s.get("optional")]
        for config in ("default", "full"):
            boost = 1.0
            if config == "full" and any(not s["default_on"] for s in optional):
                boost = 1.04
            slowdown = 1.0 if config == "default" else 1.0 + 0.12 * sum(1 for s in optional if not s["default_on"])
            session.add(ModelLoad(
                run_id=DEMO_RUN_ID, model_id=model.id, config=config, load_ms=round(rng.uniform(2, 25) * 1000 * (base_mem / 4000), 0),
                weights_mb=WEIGHTS_MB[model.id], device=model.platform,
                packages={"paddlepaddle": "3.2.1", "paddleocr": "3.x"} if model.family == "paddle" else {"torch": "2.x", "transformers": "4.x"},
            ))
            for sample in samples:
                if sample.category not in model.covers:
                    continue
                # Without optional stages both settings run the same pipeline, so they must give the same result.
                srng = random.Random(f"{model.id}|{sample.id}|{config if optional else 'same'}")
                quality = min(0.995, SKILL[model.id].get(sample.category, 0.5) * boost)
                quality = max(0.0, min(1.0, quality + srng.uniform(-0.06, 0.06)))
                error = None
                output = predict(srng, model.id, sample, quality, config)
                if srng.random() < 0.02:
                    error, output = "Timed out after 120 s", ""
                ref = sample.ground_truth.get("text") or sample.ground_truth.get("latex") or sample.ground_truth.get("smiles", "")
                sc, native = metrics.score(sample.gt_kind, sample.category, ref, output) if not error else (0.0, {})
                lines = []
                if model.kind != "vlm" and sample.gt_kind == "text" and not error:
                    out_lines = output.splitlines()
                    for i, ln in enumerate(sample_lines[sample.id]):
                        poly = [[x + srng.randint(-5, 5), y + srng.randint(-4, 4)] for x, y in ln["poly"]]
                        lines.append({"text": out_lines[i] if i < len(out_lines) else "", "poly": poly,
                                      "score": round(min(0.999, quality + srng.uniform(-0.1, 0.05)), 3)})
                session.add(Prediction(
                    run_id=DEMO_RUN_ID, model_id=model.id, config=config, sample_id=sample.id, output=output,
                    lines=lines, stages_run=[s["id"] for s in model.pipeline if s["default_on"] or config == "full"],
                    total_ms=round(base_s * slowdown * math.exp(srng.gauss(0, 0.3)) * 1000, 1),
                    peak_mem_mb=round(base_mem * (1 + 0.1 * (config == "full" and bool(optional))) * srng.uniform(0.92, 1.08), 0),
                    error=error, score=sc, metrics=native,
                ))

            rel = stage_relevance(model)
            strength = sum(SKILL[model.id].values()) / len(SKILL[model.id]) if SKILL[model.id] else 0.8
            crng = random.Random(f"{model.id}|checklist|{config if optional else 'same'}")
            for stage in stages:
                claim = True if stage.id in rel else None
                if stage.collect.strip() in ("", "—") and stage.group not in ("D", "O"):
                    test = "N/T"
                elif claim:
                    r = crng.random() / (1.08 if config == "full" and optional else 1.0)
                    test = "PASS" if r < strength - 0.1 else "PARTIAL" if r < strength + 0.12 else "FAIL"
                else:
                    test = "FAIL" if crng.random() < 0.85 else "PARTIAL"
                session.add(ChecklistCell(
                    run_id=DEMO_RUN_ID, model_id=model.id, config=config, stage_id=stage.id, claim=claim,
                    claim_source="demo" if claim else None, test=test,
                ))

        for step in optional:
            off = rng.uniform(55, 85)
            session.add(Ablation(run_id=DEMO_RUN_ID, model_id=model.id, flag=step["id"], label=step["name"],
                                 score_off=round(off, 2), score_on=round(off + rng.uniform(-4, 6), 2)))
    session.commit()


def ensure_demo_db() -> None:
    """Create tables and the demo run if the database is empty (local / first deploy)."""
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        if session.get(Run, DEMO_RUN_ID) is None:
            seed_demo(session)


if __name__ == "__main__":
    ensure_demo_db()
    print("demo database ready")
