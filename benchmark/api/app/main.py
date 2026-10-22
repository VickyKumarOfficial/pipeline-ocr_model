"""Read-only API for the Niera OCR benchmark dashboard.

Run locally:  uv run fastapi dev app/main.py
"""

import json
import os
from collections import defaultdict
from pathlib import Path
from statistics import mean

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import schemas as S
from .categories import BY_ID, CATEGORIES, FOCUS_IDS
from .db import get_session
from .seed import ensure_demo_db
from .tables import Ablation, ChecklistCell, Model, ModelLoad, Prediction, Run, Sample, Stage

if not os.environ.get("DATABASE_URL") or os.environ.get("SEED_DEMO") == "1":
    ensure_demo_db()

app = FastAPI(title="Niera OCR Benchmark API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.mount("/api/media", StaticFiles(directory=Path(__file__).parent / "static"), name="media")

PRIORITY_WEIGHT = {"H": 3, "H if in scope": 3, "M": 2, "L": 1}
GROUP_NAMES = json.loads((Path(__file__).parent / "data" / "stages.json").read_text())["groups"]

Config = Query("default", pattern="^(default|full)$")


def pick_run(session: Session, run_id: str | None) -> Run:
    if run_id:
        run = session.get(Run, run_id)
    else:
        # Latest real run wins over the demo run.
        run = session.scalars(select(Run).order_by(Run.is_demo, Run.created_at.desc())).first()
    if run is None:
        raise HTTPException(404, "No run found. Publish a run first.")
    return run


def run_out(run: Run) -> S.RunOut:
    return S.RunOut.model_validate(run, from_attributes=True)


def model_out(m: Model) -> S.ModelOut:
    return S.ModelOut.model_validate(m, from_attributes=True)


def quantile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    v = sorted(values)
    pos = (len(v) - 1) * q
    lo, hi = int(pos), min(int(pos) + 1, len(v) - 1)
    return round(v[lo] + (v[hi] - v[lo]) * (pos - lo), 1)


def category_scores(model: Model, preds: list[Prediction]) -> list[S.CategoryScore]:
    by_cat: dict[str, list[float]] = defaultdict(list)
    for p in preds:
        if p.score is not None:
            by_cat[cat_of[p.sample_id]].append(p.score)
    out = []
    for c in CATEGORIES:
        vals = by_cat.get(c.id, [])
        applicable = c.id in model.covers
        out.append(S.CategoryScore(category=c.id, score=round(mean(vals), 1) if (vals and applicable) else None, n=len(vals)))
    return out


cat_of: dict[str, str] = {}


def load_categories(session: Session) -> None:
    for sid, cat in session.execute(select(Sample.id, Sample.category)):
        cat_of[sid] = cat


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/runs", response_model=list[S.RunOut])
def runs(session: Session = Depends(get_session)):
    return [run_out(r) for r in session.scalars(select(Run).order_by(Run.created_at.desc()))]


@app.get("/api/overview", response_model=S.Overview)
def overview(run_id: str | None = None, config: str = Config, session: Session = Depends(get_session)):
    run = pick_run(session, run_id)
    load_categories(session)
    models = session.scalars(select(Model)).all()
    preds = session.scalars(select(Prediction).where(Prediction.run_id == run.id, Prediction.config == config)).all()
    cells = session.scalars(select(ChecklistCell).where(ChecklistCell.run_id == run.id, ChecklistCell.config == config)).all()
    stages = {s.id: s for s in session.scalars(select(Stage))}

    preds_by_model: dict[str, list[Prediction]] = defaultdict(list)
    for p in preds:
        preds_by_model[p.model_id].append(p)
    cells_by_model: dict[str, list[ChecklistCell]] = defaultdict(list)
    for c in cells:
        cells_by_model[c.model_id].append(c)

    sample_counts: dict[str, int] = defaultdict(int)
    for cat in cat_of.values():
        sample_counts[cat] += 1

    rows = []
    for m in models:
        mp = preds_by_model.get(m.id, [])
        scores = category_scores(m, mp)
        focus = [s.score for s in scores if s.category in FOCUS_IDS and s.score is not None]
        tested = [c for c in cells_by_model.get(m.id, []) if c.test != "N/T"]
        cap = None
        if tested:
            got = sum(PRIORITY_WEIGHT.get(stages[c.stage_id].priority, 1) * {"PASS": 1, "PARTIAL": 0.5}.get(c.test, 0) for c in tested)
            total = sum(PRIORITY_WEIGHT.get(stages[c.stage_id].priority, 1) for c in tested)
            cap = round(100 * got / total, 1)
        gate_cells = [c for c in cells_by_model.get(m.id, []) if c.stage_id in ("R01", "R02", "R03") and c.test != "N/T"]
        gate = "untested" if not gate_cells else "flagged" if any(c.test == "FAIL" for c in gate_cells) else "pass"
        times = [p.total_ms for p in mp if not p.error]
        rows.append(S.LeaderboardRow(
            model=model_out(m), rank=None, focus_score=round(mean(focus), 1) if focus else None,
            focus_coverage=sum(1 for c in FOCUS_IDS if c in m.covers), scores=scores, capability_score=cap,
            hallucination_gate=gate, p50_ms=quantile(times, 0.5), p95_ms=quantile(times, 0.95),
            peak_mem_mb=max((p.peak_mem_mb for p in mp), default=None), errors=sum(1 for p in mp if p.error),
        ))

    ranked = sorted((r for r in rows if r.focus_coverage == len(FOCUS_IDS) and r.focus_score is not None),
                    key=lambda r: -r.focus_score)
    for i, r in enumerate(ranked, 1):
        r.rank = i
    rows.sort(key=lambda r: (r.rank is None, r.rank or 0, -(r.focus_score or -1), r.model.status != "tested"))

    cats = [S.CategoryOut(id=c.id, label=c.label, metric=c.metric, focus=c.focus, sample_count=sample_counts.get(c.id, 0))
            for c in CATEGORIES]
    return S.Overview(run=run_out(run), config=config, categories=cats, rows=rows)


@app.get("/api/checklist", response_model=S.Checklist)
def checklist(run_id: str | None = None, config: str = Config, session: Session = Depends(get_session)):
    run = pick_run(session, run_id)
    stages = session.scalars(select(Stage).order_by(Stage.position)).all()
    models = [m for m in session.scalars(select(Model)).all()]
    cells = session.scalars(select(ChecklistCell).where(ChecklistCell.run_id == run.id, ChecklistCell.config == config)).all()
    return S.Checklist(
        run=run_out(run), config=config, groups=GROUP_NAMES,
        stages=[S.StageOut.model_validate(s, from_attributes=True) for s in stages],
        models=[model_out(m) for m in models],
        cells=[S.Cell.model_validate(c, from_attributes=True) for c in cells],
    )


@app.get("/api/models/{model_id}", response_model=S.ModelDetail)
def model_detail(model_id: str, run_id: str | None = None, session: Session = Depends(get_session)):
    run = pick_run(session, run_id)
    m = session.get(Model, model_id)
    if m is None:
        raise HTTPException(404, f"Unknown model {model_id}")
    load_categories(session)
    preds = session.scalars(select(Prediction).where(Prediction.run_id == run.id, Prediction.model_id == m.id)).all()
    loads = {l.config: l for l in session.scalars(select(ModelLoad).where(ModelLoad.run_id == run.id, ModelLoad.model_id == m.id))}
    cells = session.scalars(select(ChecklistCell).where(ChecklistCell.run_id == run.id, ChecklistCell.model_id == m.id)).all()
    abl = session.scalars(select(Ablation).where(Ablation.run_id == run.id, Ablation.model_id == m.id)).all()
    samples = {s.id: s for s in session.scalars(select(Sample))}

    by_cfg: dict[str, list[Prediction]] = defaultdict(list)
    for p in preds:
        by_cfg[p.config].append(p)
    tests: dict[str, dict[str, int]] = {}
    for c in cells:
        tests.setdefault(c.config, {"PASS": 0, "PARTIAL": 0, "FAIL": 0, "N/T": 0})[c.test] += 1
    worst = sorted((p for p in by_cfg.get("default", []) if p.score is not None), key=lambda p: p.score)[:6]
    return S.ModelDetail(
        run=run_out(run), model=model_out(m),
        scores={cfg: category_scores(m, ps) for cfg, ps in by_cfg.items()},
        latencies_ms={cfg: sorted(p.total_ms for p in ps if not p.error) for cfg, ps in by_cfg.items()},
        peak_mem_mb={cfg: max((p.peak_mem_mb for p in ps), default=None) for cfg, ps in by_cfg.items()},
        load_ms={cfg: l.load_ms for cfg, l in loads.items()},
        weights_mb=next(iter(loads.values())).weights_mb if loads else None,
        ablations=[S.AblationOut.model_validate(a, from_attributes=True) for a in abl],
        tests=tests,
        worst=[S.SampleBrief(id=p.sample_id, category=cat_of[p.sample_id], image_url=samples[p.sample_id].image_url, score=p.score)
               for p in worst],
    )


@app.get("/api/samples", response_model=list[S.SampleListItem])
def sample_list(run_id: str | None = None, config: str = Config, category: str | None = None,
                session: Session = Depends(get_session)):
    run = pick_run(session, run_id)
    q = select(Sample).order_by(Sample.id)
    if category:
        q = q.where(Sample.category == category)
    samples = session.scalars(q).all()
    scores: dict[str, list[float]] = defaultdict(list)
    for sid, sc in session.execute(select(Prediction.sample_id, Prediction.score).where(
            Prediction.run_id == run.id, Prediction.config == config)):
        if sc is not None:
            scores[sid].append(sc)
    return [S.SampleListItem(
        sample=S.SampleOut.model_validate(s, from_attributes=True),
        best_score=max(scores[s.id]) if scores[s.id] else None,
        worst_score=min(scores[s.id]) if scores[s.id] else None,
        mean_score=round(mean(scores[s.id]), 1) if scores[s.id] else None,
    ) for s in samples]


@app.get("/api/samples/{sample_id:path}", response_model=S.SampleDetail)
def sample_detail(sample_id: str, run_id: str | None = None, config: str = Config, session: Session = Depends(get_session)):
    run = pick_run(session, run_id)
    s = session.get(Sample, sample_id)
    if s is None:
        raise HTTPException(404, f"Unknown sample {sample_id}")
    models = {m.id: m for m in session.scalars(select(Model))}
    preds = session.scalars(select(Prediction).where(
        Prediction.run_id == run.id, Prediction.config == config, Prediction.sample_id == s.id)).all()
    preds = sorted(preds, key=lambda p: -(p.score or -1))
    ran = {p.model_id for p in preds}
    return S.SampleDetail(
        run=run_out(run), config=config, sample=S.SampleOut.model_validate(s, from_attributes=True),
        category_metric=BY_ID[s.category].metric,
        predictions=[S.PredictionOut(
            model=model_out(models[p.model_id]), output=p.output, lines=p.lines, stages_run=p.stages_run,
            total_ms=p.total_ms, peak_mem_mb=p.peak_mem_mb, error=p.error, score=p.score, metrics=p.metrics,
        ) for p in preds],
        not_run=[model_out(m) for m in models.values() if s.category in m.covers and m.id not in ran],
    )
