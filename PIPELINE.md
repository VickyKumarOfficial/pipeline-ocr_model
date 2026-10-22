# PIPELINE.md: Working Plan for the Niera OCR Benchmark

This file says how we work and in what order. Tick the checkboxes as phases finish. When a decision changes, edit this file and add a row to the Decision Log at the bottom.

Tags like `[S7]` point to [SOURCES.md](SOURCES.md). A statement with no tag is our own plan or judgement. **Add a source row to SOURCES.md for every new fact you write here.**

---

## 0. Ground rules

1. **Raw datasets are read-only.** Never edit anything under `Chemistry/` or `Physics/`. Everything derived goes into `benchmark/`.
2. **One manifest.** Every model reads `benchmark/data/manifest.jsonl`. At inference time, nothing reads the dataset folders directly.
3. **Same bytes in.** Each manifest row stores the SHA-256 of its input file. The runner refuses to start on a hash mismatch.
4. **No pre-processing and no conversion.** The harness passes the original file path, nothing more. No PDF-to-image step, no resizing, no rotation. If a model cannot read a format, it gets FAIL on that input stage (stages F01–F04 in STAGES.md). That inability is part of its raw capability.
5. **Two configs per model:**
   - `default`: library defaults, untouched.
   - `full`: every optional stage turned on.
   Many PaddleOCR stages are off by default, so defaults alone hide capability [S8] [S7].
   - `ablation`: each optional stage toggled alone, to show whether it helps (STAGES.md, ranking).
   - Set the pre-processing flags explicitly in every run, because the defaults differ between pipelines (True in basic OCR, False in PP-StructureV3 and PaddleOCR-VL) [S10] [S7].
6. **Same machine, one model at a time.** Record hardware and package versions in every run manifest.
7. **Warm-up excluded.** Run one warm-up image per model before timing. Record load time separately.
8. **Shared scoring.** One normalisation function and one metric implementation for all models, including the API baseline.
9. **Claim vs evidence.** The capability checklist always separates "documentation says" from "we tested".
10. **Freeze before scoring.** Lock the manifest, thresholds and normalisation before any result is seen.
11. **Licensing.** Every eval set records its license. Non-commercial sets stay out of training, and out of evaluation until legal approves (README, open question 4).
12. **Prompts (only for models that need one).**
    - Each model has a `needs_prompt: true|false` flag in `configs/models.yaml`. If it is `true`, the adapter sends the file plus the prompt. If it is `false`, the adapter sends the file only.
    - `needs_prompt: false` covers pipeline APIs such as PP-OCRv6, PP-StructureV3, `PaddleOCRVL().predict` and the GLM-OCR SDK [S35] [S30].
    - `needs_prompt: true` covers raw chat-style VLMs such as Qwen3-VL [S31].
    - **One neutral prompt for every prompt-needing model: `"Extract all text from this image."`** It states the task only, with no hints about output format (no "use LaTeX", no "do not summarise"). That way no model gets an advantage from extra instructions (team decision 2026-10-22).
    - If a model summarises or answers instead of transcribing, that is recorded as its raw behaviour, not fixed with a better prompt.
    - Scoring normalises output format (for example, LaTeX vs Unicode math) so a neutral prompt does not punish a format choice. This is defined in `eval/normalize.py` before results are seen.
    - The prompt is stored in `configs/prompts.yaml` and logged in `run.json`. It is never changed after results are seen.
13. **Local datasets are not used.** Nothing under `Chemistry/` or `Physics/` enters the pipeline (team decision 2026-10-22). Inputs come only from the collection spec in Phase 2.

---

## 1. Machine constraints (measured 2026-10-22)

| Item | Value | Impact |
|---|---|---|
| Chip / RAM | Apple M4, 16 GB [M1] | No CUDA. PaddleOCR-VL runs locally through the Paddle CPU engine; MLX-VLM works only as a separate service [S6]. HPD-Parsing cannot run here [S13]. Run one model at a time. |
| Free disk | **7.6 GB** [M2] | **Blocker.** Free about 30 GB, or move the model cache to an external drive. Our estimate, not measured. |
| System Python | 3.14.6 [M3] | No paddlepaddle wheels for 3.14 [S5]. Use `uv` venvs with Python 3.12, which is inside the supported range [S3] [S4] [S7]. |
| Git | Repo already holds about 5.7 GB of datasets [M4] | Keep `benchmark/results/`, model caches and venvs out of git. |

---

## 2. Phases

### Phase 0: Environment

- [ ] Free disk space, or mount an external drive.
- [ ] Relocate the model cache. `PADDLE_PDX_CACHE_HOME` is read in PaddleX source but is not documented [S18]. Confirm it works with a test download. `PADDLE_PDX_MODEL_SOURCE` picks HuggingFace or BOS as the download source [S24].
- [ ] Create one environment per family so their dependencies cannot conflict:
  ```bash
  uv venv envs/paddle  --python 3.12   # PP-OCRv5/v6, PP-StructureV3, Formula, Chart2Table, PaddleOCR-VL
  uv venv envs/mlxvlm  --python 3.12   # MLX-VLM server: PaddleOCR-VL backend [S6], Qwen3-VL, GLM-OCR [S30]
  uv venv envs/decimer --python 3.10   # DECIMER (README example uses Python 3.10, TensorFlow) [S28]
  uv venv envs/harness --python 3.12   # scoring: jiwer [S74], rdkit [S75], pandas, pyyaml
  ```
- [ ] Install Paddle per the Apple Silicon guide (verified on M4) [S6]:
  ```bash
  python -m pip install paddlepaddle==3.2.1 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
  python -m pip install -U "paddleocr[doc-parser]"
  ```
  The general install page lists `paddlepaddle==3.2.0` [S5]. We follow the Apple guide because it targets this hardware.
- [ ] Run each model's documented demo once.
- [ ] Save `pip freeze` for each environment to `benchmark/configs/env_lock/`.

**Exit:** every Tier A model returns output on its demo image.

### Phase 1: Model internals research + scope decision

- [ ] **Team decision: which challengers get added** (README, "Evidence that changes the original scope"). Record it in the Decision Log.
- [ ] For each model, write `benchmark/docs/models/<model_id>.md` from the template in §5. Use primary sources only, cite each claim, and add the sources to SOURCES.md.

PaddleOCR:
- [ ] pp_ocrv6 (tiny / small / medium)
- [ ] pp_ocrv5 (server / mobile / en_mobile / devanagari_mobile)
- [ ] pp_structurev3
- [ ] paddleocr_vl_1_6, paddleocr_vl_1_5
- [ ] formula_rec (PP-FormulaNet_plus-S/M/L, UniMERNet)
- [ ] pp_chart2table
- [ ] hpd_parsing (docs only)

Challengers, if approved:
- [ ] qwen3_vl_8b (confirm license first: S31 is UNVERIFIED)
- [ ] glm_ocr
- [ ] decimer_handdrawn
- [ ] uni_mumer (after legal check [S29] [S54])

Baseline:
- [ ] baseline_api: inputs, outputs, limits, cost, version

Each write-up fills its column in `benchmark/configs/capabilities_claimed.yaml`. The checklist generator reads that file.

**Exit:** every model has a write-up and a claimed-capability entry, and every claim is tagged.

### Phase 2: Input collection (later; spec in §3.3)

- [ ] The team collects inputs following the collection spec (§3.3). Every checklist stage needs at least the listed number of files.
- [ ] Each file is stored as-is, in its original format (JPG, PNG, HEIC, PDF, DOCX). It is never converted.
- [ ] `scripts/build_manifest.py` writes `manifest.jsonl`: id, path, SHA-256, format, stage tags, source, consent/license.
- [ ] Ground truth for each file goes in `data/gt/<id>.json`: text, LaTeX, SMILES, table HTML, region boxes, as relevant. Without ground truth, a file can show only *whether* a model handles it, not *how well*.
- [ ] Freeze: after this point, the manifest does not change for a run.

**Exit:** every stage in §3.1 has its minimum number of files, hashes are verified, and ground truth loads.

### Phase 3: Harness and adapters

- [ ] `runners/base.py`: the `Runner` interface (§4.1).
- [ ] One adapter per model. Each adapter runs as a subprocess in its own environment and writes the unified schema (§4.2).
- [ ] `scripts/run_all.py --models all --config default|full --set all` writes `results/<run_id>/`.
- [ ] Resumable. A per-sample timeout records `error` and moves on.
- [ ] Save the intermediate output of every stage (§4.3).
- [ ] `runners/baseline_api.py` sends the same files to the current API and writes the same schema.

**Exit:** `run_all.py` finishes on 5 samples per set for every model.

### Phase 4: Smoke test

- [ ] Run 5 samples per set, both configs. Inspect the output by hand. Fix adapter bugs, not model behaviour.

### Phase 5: Full run

- [ ] Run the full eval set, `default` + `full`, for every approved model plus the baseline. Log peak memory and wall time.
- [ ] Optional: HPD-Parsing in the cloud. It is a 1B BF16 model on an InternVL3.5-1B backbone [S38], so the weights are roughly 2 GB (our arithmetic: 1B params × 2 bytes). VRAM is not the problem.
  - **First try:** free Colab T4 or Kaggle T4. T4 has compute capability 7.5, which meets vLLM's minimum [S39], but it is not on HPD-Parsing's tested list [S13]. Run `nvidia-smi` first; the driver must support CUDA 12.8 or later [S13]. Team check (2026-10-22): `nvidia-smi` reports CUDA 13.0, which meets the stated minimum. The NVIDIA compatibility page we read does not confirm that a CUDA 12.x wheel runs on a 13.x driver [S40b], so the Phase 4 smoke test decides.
  - **Fallback:** Colab paid A100 or G4 (RTX PRO 6000), which are tested GPUs [S13] [S36].
  - **Not usable:** Kaggle P100, which is below vLLM's 7.5 minimum [S39].
  - Install with the prebuilt wheel, not Docker [S13].
  - Compare accuracy across machines; report speed separately.

### Phase 6: Scoring + checklist

- [ ] `scripts/score.py` writes `results/<run_id>/scores.csv` (metrics in §6).
- [ ] `scripts/make_report.py` generates `reports/capability_checklist.txt` and `reports/comparison_report.md`.
- [ ] Save 10 failure cases per model per set to `reports/failures/`, with notes.

### Phase 7: Decision

- [ ] Team review, scored against the criteria in §7.
- [ ] Pick 1–2 models to fine-tune, then write the fine-tuning plan as the next phase.

---

## 3. Stage capability checklist

### 3.1 Stages

The full list lives in **[STAGES.md](STAGES.md)**: 70+ stages in 8 groups (input, pre-processing, layout, text, special content, output, robustness/hallucination, deployment). Each stage has a priority, the inputs to collect, and a source.

### 3.2 Generated file

`reports/capability_checklist.txt` is the one file the team reads. Its layout:

```
NIERA OCR CAPABILITY CHECKLIST            run_id=<run_id>   generated=<timestamp>
Cell = CLAIM[source] / TEST   CLAIM: docs say yes ("--" = no claim)   TEST: PASS | PARTIAL | FAIL | N/T

ID   Stage                          Pri | pp_ocrv6_m    | pp_structurev3 | paddleocr_vl_1_6 | baseline_api
P02  Page orientation 0/90/180/270   H  | CLAIM / ...   | ...            | ...              | ...
...
SUMMARY  accuracy | weighted score | stages that helped in ablation | hallucination gate
```

Every CLAIM cell needs a source id. Without one, the cell shows `--`. PASS / PARTIAL / FAIL cut-offs live in `configs/thresholds.yaml` and are agreed before Phase 6.

### 3.3 Ranking

Ranking is not a count of PASS cells. See STAGES.md, "How models are ranked":

1. Accuracy decides the winner.
2. A weighted score over PASS stages only.
3. An on/off test (ablation) for every optional stage.
4. Hallucination works as a gate.

### 3.4 Collection spec

The "Collect" column in STAGES.md is the shopping list for Phase 2. Every collected file is stored in its original format and tagged with the stage IDs it tests. Where accuracy needs to be measured, add ground truth (text, LaTeX, SMILES, table, boxes).

Licensing, if public sets are used: see SOURCES.md, datasets section. IAM, CROHME, MathWriting and OmniDocBench are non-commercial [S44] [S46] [S47] [S54] [S55]. NCERT PDFs cannot be copied [S57].

---

## 4. Schemas

### 4.1 Runner interface

```python
class Runner:
    model_id: str
    def load(self, config: dict) -> None: ...
    def predict(self, sample: dict, out_dir: Path) -> dict: ...  # unified prediction (4.2)
    def info(self) -> dict: ...  # package versions, sub-models actually loaded, device
```

### 4.2 Unified prediction (one JSON per sample per model)

```json
{
  "run_id": "…", "model_id": "pp_structurev3", "config": "full",
  "sample_id": "answer_sheet/0001", "input_sha256": "…",
  "text_full": "plain text in reading order",
  "markdown": null,
  "lines":   [{"text": "5V", "poly": [[0,0],[1,0],[1,1],[0,1]], "score": 0.97}],
  "blocks":  [{"type": "figure|text|formula|table|chart|title", "bbox": [0,0,1,1], "content": "…", "order": 3}],
  "formulas":[{"latex": "…", "bbox": [0,0,1,1]}],
  "tables":  [{"html": "…", "bbox": [0,0,1,1]}],
  "charts":  [{"table": "…", "bbox": [0,0,1,1]}],
  "structures": [{"kind": "smiles|chemfig|components", "value": "…"}],
  "stages_run": ["doc_ori", "layout", "det", "rec"],
  "timing_ms": {"total": 0, "per_stage": {}},
  "peak_rss_mb": 0,
  "raw_output": "raw.json",
  "error": null
}
```

### 4.3 Stage artefacts ("working data" for the team)

```
results/<run_id>/<model_id>/<config>/<sample_id>/
├── prediction.json     unified schema
├── raw.json            native model output, unchanged
└── stages/             01_doc_ori.json, 02_unwarp.png, 03_layout.png, 04_det.png, 05_rec.json, ...
```

PaddleOCR results already expose per-stage fields such as `doc_preprocessor_res`, `dt_polys`, `rec_texts` and `rec_scores`, and offer `save_to_img` / `save_to_json` [S10] [S8]. The adapter saves those fields.

### 4.4 Run manifest

`results/<run_id>/run.json` records: timestamp, git commit, machine, `pip freeze` for each environment, the sub-model names actually loaded, configs, the manifest hash and the thresholds hash.

---

## 5. Model internals

### 5.1 Write-up template (`benchmark/docs/models/<model_id>.md`)

```
# <Model> (<version>, released <date>) [source]
## Summary
## Architecture: type, encoder/decoder, params, weight size [sources]
## Internal pipeline, in execution order
  | # | Stage | Default sub-model | Alternatives | Flag | Default on? | Output | Source |
## Inputs / outputs
## Flags that matter for Niera
## Hardware + backends
## Claimed capabilities mapped to S00–S25, each with a source
## Published benchmarks: vendor-reported vs independent, kept apart
## Known limitations
## Fine-tuning path
## License (code AND weights)
## Sources
```

### 5.2 What we know so far

| Model | Internal stages, in order | Sources |
|---|---|---|
| General OCR (PP-OCRv6 / v5) | doc orientation `PP-LCNet_x1_0_doc_ori` (optional) → unwarping `UVDoc` (optional) → textline orientation `PP-LCNet_x0_25/x1_0_textline_ori` (optional) → detection `PP-OCRv6_*_det` / `PP-OCRv5_*_det` → recognition `PP-OCRv6_*_rec` / `PP-OCRv5_*_rec`. Default tier PP-OCRv6_medium. The docs list textline orientation before detection; in execution it works on detected lines. Confirm in Phase 1 | [S10] |
| PP-StructureV3 | doc pre-processing (orientation, unwarping) → layout `PP-DocLayout_plus-L` + region detection → OCR (PP-OCRv5_server det/rec, optional textline orientation) → table (classifier, cell detection, SLANeXt structure) → formula `PP-FormulaNet_plus-L` → seal → chart `PP-Chart2Table` → reading order → JSON / Markdown / Word | [S8] [S9] |
| PaddleOCR-VL 1.5 / 1.6 | optional doc pre-processing → layout `PP-DocLayoutV3` (finds elements and reading order) → crop each element → 0.9B VLM recognition → merge in reading order. v1's VLM is a NaViT-style encoder + ERNIE-4.5-0.3B; 1.6 keeps 1.5's architecture. No explicit encoder statement found for 1.5 | [S7] [S9] [S14] [S16] |
| Formula pipeline | orientation (optional) → unwarping (optional) → layout (optional) → formula model to LaTeX | [S12] |
| HPD-Parsing | single VLM with hierarchical parallel decoding; custom vLLM; NVIDIA only | [S13] |
| DECIMER hand-drawn | EfficientNetV2 encoder → Transformer decoder → SMILES | [S28] |

PP-StructureV3 defaults: table, formula and region detection on; orientation, unwarping, textline orientation, seal and chart off [S8].

---

## 6. Metrics

Shared normalisation in `eval/normalize.py`: Unicode NFKC, collapsed whitespace, unified quote styles. This is our choice.

| Task | Metric | Source |
|---|---|---|
| Text recognition | CER, WER via jiwer | [S74] |
| Text detection | P/R/F1 at polygon IoU ≥ 0.5 | our choice; usual convention |
| End-to-end text spotting | F1 where IoU ≥ 0.5 and normalised text matches | our choice |
| Formula | ExpRate (exact match), normalised edit distance, BLEU, CDM | ExpRate as used in [S29]; CDM [S71]; BLEU as reported in [S12] |
| SMILES | validity rate, canonical exact match (RDKit), Tanimoto | [S75] [S28] |
| chemfig | normalised edit distance against `ssml_normed` | our choice; field from the EDU-CHEMC README [M5] |
| Diagram region | recall of GT component boxes covered by a figure block | our choice |
| Table | TEDS | [S70] |
| Chart | RMS-F1, SCRM | [S72] [S73] |
| Robustness | score on bad photos (P01–P09 inputs) vs clean inputs | our choice |
| Cost | p50/p95 latency, peak RSS, weights on disk | measured |

---

## 7. Decision criteria (agree before Phase 6)

A model goes to fine-tuning only if all four hold:

1. **Accuracy.** It beats the baseline API on `niera_real` in at least one priority category (handwritten text, handwritten formula, diagram text), or scores within an agreed margin overall while running fully offline.
2. **Budget.** It fits Niera's latency and memory budget on the target deployment hardware. The budget is still to be defined.
3. **License.** Code and weights both allow commercial use. PaddleOCR code and the VL-1.6 / PP-OCRv6 weights are Apache-2.0 [S2] [S14] [S34]. Check each challenger separately [S30] [S31] [S32] [S33].
4. **Fine-tuning path.** An official recipe exists for the stages we need. Known gaps:
   - The SFT guide covers PaddleOCR-VL v1 [S21].
   - LoRA and full fine-tuning exist for VL-1.5 [S22].
   - **No VL-1.6 guide was found** [S22].
   - The VL pipeline's layout and reading-order models cannot be fine-tuned [S7].
   - PP-OCRv6/v5 det/rec and PP-FormulaNet have official recipes [S11] [S12].

---

## 8. Proposed code layout

```
benchmark/
├── configs/      models.yaml, eval_sets.yaml, capabilities_claimed.yaml, thresholds.yaml, env_lock/
├── data/         manifest.jsonl, eval/, gt/
├── runners/      base.py, pp_ocr.py, pp_structurev3.py, paddleocr_vl.py, formula.py, chart2table.py,
│                 qwen3_vl.py, glm_ocr.py, decimer.py, uni_mumer.py, baseline_api.py
├── eval/         normalize.py, metrics_text.py, metrics_formula.py, metrics_chem.py, metrics_layout.py
├── scripts/      build_manifest.py, run_all.py, score.py, make_report.py
├── docs/models/
├── results/      gitignored
└── reports/      capability_checklist.txt, comparison_report.md, failures/
```

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Disk fills up during model download [M2] | Phase 0 blocker: free space or use an external cache |
| CPU too slow for PP-StructureV3 / VL | Small sets first; run VL through the MLX-VLM server [S6]; rent a GPU only if needed |
| Dependency conflicts (Paddle / TensorFlow / MLX) | Separate venvs; adapters run as subprocesses |
| Vendor benchmarks overstate results | Keep vendor-reported and independent numbers apart; decide on `niera_real` only |
| Benchmarks tested old versions (S26 and S27 tested PaddleOCR-VL v1, not 1.6) | Re-test 1.6 ourselves before ruling it out |
| License problems with eval or training data | License column in manifest; legal sign-off on non-commercial sets |
| Results drift toward one model | Freeze manifest, thresholds and normalisation before scoring |
| Baseline API changes mid-test | Record API version and date; run the baseline in the same week |

---

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-10-22 | PaddleOCR Tier A: PP-OCRv6, PP-OCRv5 (incl. Devanagari), PP-StructureV3, PaddleOCR-VL-1.6/1.5, Formula pipeline, PP-Chart2Table | Open source, run offline on M4 [S2] [S6] |
| 2026-10-22 | HPD-Parsing deferred; PP-ChatOCRv4 excluded | NVIDIA only [S13]; depends on an LLM API [S2] |
| 2026-10-22 | `default` + `full` config per model | Optional stages are off by default [S8] |
| 2026-10-22 | **Proposed, pending team:** add Qwen3-VL-8B, GLM-OCR, DECIMER, Uni-MuMER as challengers | PaddleOCR shows gaps on handwriting, handwritten math, hand-drawn charts and chemistry [S26] [S12] [S27] [S28] |
| 2026-10-22 | Local datasets excluded; no file conversion; models get raw files | Team decision: test raw model capability |
| 2026-10-22 | One neutral prompt (`needs_prompt` flag) | Fairness: no model gets extra instructions |
| 2026-10-22 | Ranking by accuracy + weighted PASS + ablation, not by counting stages | Stage count does not predict quality (STAGES.md) |
| 2026-10-22 | **Proposed, pending team:** `niera_real` is the deciding eval set | Public benchmarks do not cover Indian answer sheets; vendor and independent numbers disagree [S11] [S26] |
| 2026-10-22 | Challengers approved: Qwen3-VL-8B, GLM-OCR, DECIMER, Uni-MuMER. They run on Colab T4 in float16 | Team decision; T4 has no bfloat16 [S88] |
| 2026-10-22 | No model is called through a hosted API. The baseline is Niera's current production OCR output, supplied later | Team decision |
| 2026-10-22 | Results dashboard: Next.js + shadcn/ui frontend, FastAPI backend, Postgres (Neon). Public, no login. Code in `benchmark/dashboard` and `benchmark/api` | Team decision; one Python codebase shares result schemas with the harness |
| 2026-10-22 | **Pending:** dashboard hosting. Vercel needs the paid Pro plan for company use [S80] [S81]; the free option is Cloudflare Pages + Cloud Run [S83] [S84] [S85] | Hobby plan is non-commercial only |
| 2026-10-22 | Phase 0 fix: create venvs with `uv venv --seed` or install with `uv pip install`; `python -m pip` fails in a plain uv venv | [S89] |
