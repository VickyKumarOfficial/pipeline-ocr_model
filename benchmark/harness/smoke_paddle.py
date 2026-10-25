"""Phase 0 smoke test: does each PaddleOCR-family model load and return output on one image?

Not a benchmark. One image per model, library defaults, CPU. Each model runs in its own
process so memory is measured per model and one crash does not stop the others.

    envs/paddle/bin/python benchmark/harness/smoke_paddle.py            # all models
    envs/paddle/bin/python benchmark/harness/smoke_paddle.py pp_ocrv6_m # one model

Output: benchmark/results/smoke/<model_id>/ (raw JSON + Markdown from PaddleOCR) and
benchmark/results/smoke/summary.json.
"""

import json
import os
import platform
import resource
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEMO = ROOT / "benchmark/api/app/static/demo"
OUT = ROOT / "benchmark/results/smoke"
CACHE = ROOT / "model_cache/paddlex"

# Synthetic demo images (made for the dashboard, not real student pages).
MODELS = {
    "pp_ocrv6_m": ("handwritten_text__0001.png", "PaddleOCR",
                   dict(text_detection_model_name="PP-OCRv6_medium_det", text_recognition_model_name="PP-OCRv6_medium_rec")),
    "pp_ocrv5_server": ("handwritten_text__0001.png", "PaddleOCR",
                        dict(text_detection_model_name="PP-OCRv5_server_det", text_recognition_model_name="PP-OCRv5_server_rec")),
    # No Hindi demo image yet (Pillow cannot shape Devanagari); this only checks the model loads and runs.
    "pp_ocrv5_devanagari": ("printed_text__0001.png", "PaddleOCR", dict(lang="hi", ocr_version="PP-OCRv5")),
    "pp_doclayoutv3": ("diagram_labels__0001.png", "LayoutDetection", dict(model_name="PP-DocLayoutV3")),
    "pp_formulanet_plus_l": ("handwritten_formula__0001.png", "FormulaRecognitionPipeline",
                             dict(formula_recognition_model_name="PP-FormulaNet_plus-L")),
    "pp_structurev3": ("diagram_labels__0001.png", "PPStructureV3", {}),
    "paddleocr_vl_1_6": ("handwritten_text__0001.png", "PaddleOCRVL", dict(pipeline_version="v1.6")),
    "paddleocr_vl_1_5": ("handwritten_text__0001.png", "PaddleOCRVL", dict(pipeline_version="v1.5")),
}


def peak_rss_mb() -> float:
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return round(rss / (1024 * 1024) if platform.system() == "Darwin" else rss / 1024, 1)  # bytes on macOS, KiB on Linux


def run_one(model_id: str) -> dict:
    import paddleocr

    image, cls_name, kwargs = MODELS[model_id]
    out_dir = OUT / model_id
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    model = getattr(paddleocr, cls_name)(**kwargs)
    load_s = time.perf_counter() - t0
    t1 = time.perf_counter()
    results = list(model.predict(str(DEMO / image)))
    infer_s = time.perf_counter() - t1
    text = []
    for r in results:
        r.save_to_json(str(out_dir))
        if hasattr(r, "save_to_markdown"):
            try:
                r.save_to_markdown(str(out_dir))
            except Exception:  # some result types have no Markdown form
                pass
        data = r.json.get("res", r.json)
        if "rec_texts" in data:
            text += data["rec_texts"]
        for f in data.get("formula_res_list", []):
            text.append(f.get("rec_formula", ""))
        if "boxes" in data and not text:
            text.append(f"{len(data['boxes'])} regions: " + ", ".join(sorted({b['label'] for b in data['boxes']})))
        for blk in data.get("parsing_res_list", []):
            text.append(blk.get("block_content", ""))
    return {
        "model_id": model_id, "ok": True, "image": image, "class": cls_name, "kwargs": kwargs,
        "load_s": round(load_s, 2), "infer_s": round(infer_s, 2), "peak_rss_mb": peak_rss_mb(),
        "output_preview": "\n".join(t for t in text if t)[:600],
        "paddleocr": paddleocr.__version__,
    }


def main() -> None:
    os.environ.setdefault("PADDLE_PDX_CACHE_HOME", str(CACHE))
    if len(sys.argv) == 3 and sys.argv[1] == "--child":
        print("RESULT " + json.dumps(run_one(sys.argv[2])))
        return
    ids = sys.argv[1:] or list(MODELS)
    OUT.mkdir(parents=True, exist_ok=True)
    summary = []
    for mid in ids:
        print(f"== {mid}", flush=True)
        t = time.perf_counter()
        p = subprocess.run([sys.executable, __file__, "--child", mid], capture_output=True, text=True, env=os.environ)
        line = next((ln for ln in p.stdout.splitlines() if ln.startswith("RESULT ")), None)
        res = json.loads(line[7:]) if line else {"model_id": mid, "ok": False, "error": (p.stderr or p.stdout)[-1500:]}
        res["wall_s"] = round(time.perf_counter() - t, 1)
        summary.append(res)
        print(json.dumps({k: v for k, v in res.items() if k != "kwargs"}, ensure_ascii=False)[:900], flush=True)
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
