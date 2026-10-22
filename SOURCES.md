# SOURCES.md: Evidence register

Every factual statement in README.md and PIPELINE.md carries a tag like `[S7]`. The tag points to a row here.

- **Checked** is the date the source was read.
- **How**:
  - `direct`: the page was fetched and read while writing these docs.
  - `agent`: a research sub-agent fetched the page and returned a verbatim quote, but the quote was not re-read by hand.
  - `UNVERIFIED`: claimed somewhere, but no primary source confirmed it.
- Re-check `agent` rows before quoting them in a decision document.

`D` = `https://www.paddleocr.ai/latest/en/version3.x/`

## Niera

| ID | Source | Supports | Checked | How |
|---|---|---|---|---|
| S1 | https://niera.in (niera.app redirects here) | Niera is an AI tutor for NCERT/JEE/NEET; students upload coaching modules, PDFs and their own marked answer sheets | 2026-10-22 | direct |

## PaddleOCR

| ID | Source | Supports | Checked | How |
|---|---|---|---|---|
| S2 | https://github.com/PaddlePaddle/PaddleOCR (README, "Recent updates") | Release timeline: 3.3.0 (2025-10-16) PaddleOCR-VL; 3.4.0 (2026-01-29) VL-1.5 and PP-DocLayoutV3; 3.5.0 (2026-04-21) engine switch and Office-to-Markdown; 3.6.0 (2026-05-28) VL-1.6; 3.7.0 (2026-06-11) PP-OCRv6 tiny/small/medium (1.5M/7.7M/34.5M); 2026-07-22 HPD-Parsing announcement; Apache-2.0 license | 2026-10-22 | direct |
| S3 | https://pypi.org/project/paddleocr/ | 3.7.0 is the latest release (uploaded 2026-06-11); `requires_python >=3.8`; classifiers 3.8–3.13 | 2026-10-22 | agent |
| S4 | D `installation.html` | Core `paddleocr` supports Python ≥3.8; optional dependency groups such as `doc-parser` need ≥3.9 | 2026-10-22 | agent |
| S5 | D `paddlepaddle_installation.html`, D `paddleocr_and_paddlex.html` | CPU install `paddlepaddle==3.2.0`; PaddleOCR 3.7.x needs PaddlePaddle ≥3.0.0. No paddlepaddle release (3.2.0–3.3.1) ships cp314 wheels | 2026-10-22 | agent |
| S6 | D `pipeline_usage/PaddleOCR-VL-Apple-Silicon.html` | Verified on M4. Local inference supports only the PaddlePaddle engine. MLX-VLM (≥0.3.11) works only as a service backend (`--vl_rec_backend mlx-vlm-server`). Install uses `paddlepaddle==3.2.1` (CPU index) + `paddleocr[doc-parser]`. Docker not supported | 2026-10-22 | agent |
| S7 | D `pipeline_usage/PaddleOCR-VL.html` | Two stages: layout analysis, then VLM recognition of each crop. VLM alone ≠ full pipeline. Flags and defaults. `pipeline_version` default "v1.6". Python 3.9–3.13 verified range for VL. ERNIEKit SFT recommended. "fine-tuning of layout analysis and ranking models is not supported" | 2026-10-22 | direct + agent |
| S8 | D `pipeline_usage/PP-StructureV3.html` | Module list; flag defaults (table/formula/region on; orientation/unwarping/textline orientation/seal/chart off); Python API; JSON/Markdown/Word output | 2026-10-22 | direct |
| S9 | https://github.com/PaddlePaddle/PaddleX/tree/develop/paddlex/configs/pipelines (`PP-StructureV3.yaml`, `PaddleOCR-VL*.yaml`) | PP-StructureV3 defaults: layout `PP-DocLayout_plus-L`, formula `PP-FormulaNet_plus-L`, OCR = PP-OCRv5_server (not v6). VL v1 uses PP-DocLayoutV2; VL-1.5 and VL-1.6 use PP-DocLayoutV3 | 2026-10-22 | agent |
| S10 | D `pipeline_usage/OCR.html` | General OCR stages and per-stage models; defaults to PP-OCRv6_medium; `en_PP-OCRv5_mobile_rec` "enhances the recognition performance on handwritten English text"; result fields (`dt_polys`, `rec_texts`, ...) | 2026-10-22 | direct |
| S11 | D `algorithm/PP-OCRv6/PP-OCRv6.html` | Languages: Chinese, Traditional Chinese, English, Japanese and 46 Latin-script languages (**no Devanagari**). In-house handwriting line accuracy: medium CN 62.1 / EN 67.8; Qwen3-VL-235B EN 73.2. Fine-tuning supported | 2026-10-22 | agent |
| S12 | D `pipeline_usage/formula_recognition.html`, D `module_usage/formula_recognition.html` | Formula pipeline stages. Model BLEU table (PP-FormulaNet_plus-L En 92.22 / Zh 90.64, ...) on an **internal** test set. Pipeline page says it supports handwritten formulas; at model level only UniMERNet's description mentions handwriting. Fine-tuning recipe (§IV) | 2026-10-22 | direct + agent |
| S13 | D `pipeline_usage/HPD-Parsing.html` | NVIDIA GPU, CUDA ≥12.8, Linux x86-64 (other OS only via Docker); custom vLLM based on v0.17.1 | 2026-10-22 | direct |
| S14 | https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6 | Released 2026-05-28; 96.33% on OmniDocBench v1.6; same architecture as 1.5; 0.9B; Apache-2.0. Paper arXiv:2606.03264 | 2026-10-22 | agent |
| S35 | https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6 (Transformers example) | Raw-VLM task prompts: "OCR:", "Table Recognition:", "Formula Recognition:", "Chart Recognition:", "Spotting:", "Seal Recognition:". Full pipeline `PaddleOCRVL().predict(path)` takes no prompt | 2026-10-22 | direct |
| S15 | https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5, arXiv:2601.21957 | Released 2026-01-29; 94.5% on OmniDocBench v1.5 | 2026-10-22 | agent |
| S16 | https://arxiv.org/abs/2510.14528 (PaddleOCR-VL paper) | v1 architecture: NaViT-style dynamic-resolution encoder + ERNIE-4.5-0.3B. Claims handwriting support (v1) | 2026-10-22 | agent |
| S17 | https://arxiv.org/abs/2507.05595 (PaddleOCR 3.0 technical report) | Modular PP-StructureV3 design | 2026-10-22 | direct (abstract) |
| S18 | https://github.com/PaddlePaddle/PaddleX/blob/develop/paddlex/utils/cache.py | `PADDLE_PDX_CACHE_HOME` relocates the model cache (default `~/.paddlex`). **Code only, not in the docs** | 2026-10-22 | agent |
| S19 | https://huggingface.co/PaddlePaddle/devanagari_PP-OCRv5_mobile_rec | Devanagari recognition model exists (reported accuracy 84.96%) | 2026-10-22 | agent |
| S20 | https://huggingface.co/PaddlePaddle/PP-OCRv5_server_rec | Claims handwriting support; in-house handwritten line accuracy CN 0.5807 / EN 0.5806 | 2026-10-22 | agent |
| S21 | https://github.com/PaddlePaddle/ERNIE/blob/release/v1.4/docs/paddleocr_vl_sft.md | SFT guide for PaddleOCR-VL **v1 (0.9B) only** | 2026-10-22 | agent |
| S22 | https://github.com/PaddlePaddle/PaddleFormers/tree/develop/examples/best_practices/PaddleOCR-VL-1.5 | Full and LoRA fine-tuning for VL-1.5. **No 1.6 guide found** | 2026-10-22 | agent |
| S23 | D `doc2md.html`, D `inference_deployment/local_inference/inference_engine.html` | DOCX/XLSX/PPTX to Markdown; engines `paddle`, `paddle_static`, `paddle_dynamic`, `transformers`, `onnxruntime` | 2026-10-22 | agent |
| S24 | `PADDLE_PDX_MODEL_SOURCE` in D `module_usage/text_recognition.html` | Model download source switch (HuggingFace default, BOS alternative) | 2026-10-22 | agent |
| S34 | https://huggingface.co/PaddlePaddle/PP-OCRv6_medium_rec (and other PP-OCRv6 det/rec cards) | HF `license` field `apache-2.0`; medium_rec alone has 19M params | 2026-10-22 | agent |

## Other models (challengers)

| ID | Source | Supports | Checked | How |
|---|---|---|---|---|
| S25 | https://github.com/opendatalab/OmniDocBench | End-to-end leaderboard "(v1.6_full)", news dated 2026-09-11. Top: TeleOCR 96.91, OvisOCR2 96.47, PaddleOCR-VL-1.6 96.34, MinerU2.5-Pro 95.75, GLM-OCR 95.22, PaddleOCR-VL-1.5 94.93 | 2026-10-22 | direct |
| S26 | https://arxiv.org/abs/2608.18586 (OmniHandwritingOCR, CIKM 2026) | Independent handwriting benchmark (BLEU-4/F1/1-NED mean). Qwen3-VL-8B 72.16, Qwen2.5-VL-72B 69.76, Nanonets-OCR2-3B 65.46, DeepSeek-OCR 61.25, **PaddleOCR-VL (v1, 2025) 60.85**, GPT-4o 55.50, MinerU2.5-1.2B 18.31. Dataset release promised, not confirmed | 2026-10-22 | direct |
| S27 | https://arxiv.org/abs/2606.01348 (ChartArena), Table C.1 | Numeric charts mAP_high, digital → hand-drawn: PaddleOCR-VL (v1) 50.2 → 25.7; Qwen3-VL-8B 49.5 → 46.6; HunyuanOCR 55.2 → 40.5 | 2026-10-22 | direct |
| S28 | Rajan et al., "Advancements in hand-drawn chemical structure recognition through an enhanced DECIMER architecture", J Cheminform 16:78 (2024-07-05); https://github.com/Kohulan/DECIMER-Image_Transformer | EfficientNetV2 encoder + Transformer decoder to SMILES; MIT license; `pip install decimer`. Reported 73.25% exact match on the 5,088-image hand-drawn set (MolScribe 7.65%, MolGrapher 10.81%) | 2026-10-22 | direct (repo, abstract); **accuracy numbers: agent** (PMC page blocked) |
| S29 | https://github.com/BFlameSwift/Uni-MuMER, https://arxiv.org/abs/2505.23566 | Handwritten math to LaTeX. ExpRate CROHME 14/16/19: Qwen3.5-2B variant 83.98 / 81.17 / 80.15; HME100K 70.43. Apache-2.0 code. Training data bundle includes MathWriting (CC BY-NC-SA) | 2026-10-22 | direct |
| S30 | https://huggingface.co/zai-org/GLM-OCR, arXiv:2603.10910 | 0.9B (metadata says 1B), MIT. Official SDK pipeline **integrates PaddleOCR's PP-DocLayoutV3** for layout (Apache-2.0). Task prompts "Text Recognition:", "Formula Recognition:", "Table Recognition:". OmniDocBench 95.22 (agent). mlx-vlm support: agent only, not on card | 2026-10-22 | direct + agent |
| S31 | https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct | License apache-2.0; "Expanded OCR: Supports 32 languages"; no official OCR prompt (examples are general, e.g. "Describe this image."). Release date not stated. 4-bit MLX build: **UNVERIFIED** | 2026-10-22 | direct |
| S32 | https://github.com/opendatalab/MinerU | MinerU2.5-Pro; "MinerU Open Source License… based on Apache 2.0 with additional conditions" | 2026-10-22 | agent |
| S33 | https://github.com/datalab-to/chandra | Chandra 2: olmOCR-Bench 85.8; weights under modified OpenRAIL-M (free for under $2M revenue/funding) | 2026-10-22 | agent |
| S36 | https://mccormickml.com/2024/04/23/colab-gpus-features-and-pricing/ (updated March 2026); https://gpuperhour.com/blog/google-colab-alternatives | Colab GPUs: T4 (free), L4, A100 40/80 GB, G4 = RTX PRO 6000 (paid). H100 and G4 reported unavailable in an open GitHub issue dated 2026-08-06. Secondary sources, not Google docs. Colab CUDA version not documented | 2026-10-22 | direct (search summary) |
| S37 | https://docs.rapids.ai/deployment/stable/platforms/kaggle/; https://docs.ultralytics.com/integrations/kaggle | Kaggle accelerators: GPU T4 x2 or P100; about 30 GPU hours per week | 2026-10-22 | direct (search summary) |
| S38 | https://huggingface.co/PaddlePaddle/HPD-Parsing | "1B params", tensor type BF16, "adopts InternVL3.5-1B as its backbone"; needs "NVIDIA driver with CUDA 12.8+"; no minimum VRAM stated; benchmarks on A800 80GB | 2026-10-22 | direct |
| S39 | https://docs.vllm.ai/en/latest/getting_started/installation/gpu.html; https://developer.nvidia.com/cuda-gpus | vLLM: "compute capability 7.5 or higher (e.g., T4, RTX20xx, A100, L4, H100, B200, etc.)". NVIDIA: T4 = 7.5, A100 = 8.0, L4 = 8.9, RTX PRO 6000 Blackwell = 12.0. P100 is listed only on NVIDIA's legacy page (Pascal; its value of 6.0 was not fetched) | 2026-10-22 | direct |
| S40b | https://docs.nvidia.com/deploy/cuda-compatibility/ | Minor Version Compatibility "allows applications built within the same major CUDA release family to run on a sufficiently new driver". Across major versions (12.x app on a 13.x driver): not stated on the page we read | 2026-10-22 | direct |

## Datasets

| ID | Dataset | License | Commercial use | Checked | How |
|---|---|---|---|---|---|
| S40 | DECIMER HDM, https://zenodo.org/records/7617107 | CC BY 4.0 | Yes | 2026-10-22 | agent |
| S41 | EDU-CHEMC, https://github.com/iFLYTEK-CV/EDU-CHEMC (paper: ACM MM 2023) | **None found** (no LICENSE file; CROCS site "© All rights reserved") | **Unclear: treat as No** | 2026-10-22 | agent |
| S42 | MarkushGrapher-2 datasets, https://huggingface.co/datasets/docling-project/MarkushGrapher-2-Datasets | CC BY 4.0 (card text); source images are patent pages | Yes | 2026-10-22 | agent |
| S43 | Digitize-HCD v2, https://data.mendeley.com/datasets/rngcz5wtv8/2 (Data in Brief 2025) | CC BY 4.0 | Yes | 2026-10-22 | agent |
| S44 | IAM Handwriting, https://fki.tic.heia-fr.ch/databases/iam-handwriting-database | Non-commercial research only | No | 2026-10-22 | agent (Wayback copy) |
| S45 | CVL, https://zenodo.org/records/1492267 | CC BY-NC 4.0 | No | 2026-10-22 | agent |
| S46 | CROHME 2019, https://tc11.cvc.uab.es/datasets/ICDAR2019-CROHME-TDF_1 | CC BY-NC-SA 3.0 | No | 2026-10-22 | agent |
| S47 | CROHME 2023, https://zenodo.org/records/8428035 | CC BY-NC-SA 3.0 | No | 2026-10-22 | agent |
| S48 | HME100K, https://ai.100tal.com/dataset | Not found | Unclear | 2026-10-22 | agent |
| S49 | im2latex-100k, https://zenodo.org/records/56198 | CC0 1.0 | Yes | 2026-10-22 | agent |
| S50 | UniMER-1M / UniMER-Test, https://huggingface.co/datasets/wanderkid/UniMER_Dataset | Apache-2.0 (stated). Handwritten subset may inherit CROHME/HME100K terms (UNVERIFIED) | Yes on paper | 2026-10-22 | agent |
| S51 | ChartQA, https://github.com/vis-nlp/ChartQA | GPL-3.0; images crawled from third parties | Unclear | 2026-10-22 | agent |
| S52 | PlotQA, https://github.com/NiteshMethani/PlotQA | CC BY 4.0 data, MIT code | Yes | 2026-10-22 | agent |
| S53 | IIIT-HW-Dev, https://ilocr.iiit.ac.in/dataset/18/ | CC BY 4.0 | Yes | 2026-10-22 | agent |
| S54 | MathWriting, https://github.com/google-research/google-research/tree/master/mathwriting | CC BY-NC-SA 4.0 | No | 2026-10-22 | agent |
| S55 | OmniDocBench data, https://huggingface.co/datasets/opendatalab/OmniDocBench | "for research purposes only and not for commercial use" | No | 2026-10-22 | agent |
| S56 | HumynLabs handwritten notes, https://huggingface.co/datasets/HumynLabs/English-Handwritten-Math-Notes-Dataset | CC BY 4.0; **no transcriptions** | Yes | 2026-10-22 | agent |
| S57 | NCERT textbooks, https://ncert.nic.in/textbook.php | "No agency or individual may make electronic or print copies of these books and redistribute them" | No | 2026-10-22 | agent |
| S58 | CGHD hand-drawn circuits, https://zenodo.org/records/14042961 | CC BY 4.0 | Yes | 2026-10-22 | agent |
| S59 | SketchJudge, https://arxiv.org/abs/2601.06944 | 1,015 hand-drawn student STEM answers. License not checked | Unclear | 2026-10-22 | agent |
| S60 | Hand-drawn circuit to SPICE, YOLOv10 (Sensors 2026), https://pmc.ncbi.nlm.nih.gov/articles/PMC13259090/ | 95.14% end-to-end; code research-only, no LICENSE | No (code) | 2026-10-22 | agent |

## Metrics

| ID | Metric | Defining source | How |
|---|---|---|---|
| S70 | TEDS (tables) | Zhong et al., arXiv:1911.10683; code github.com/ibm-aur-nlp/PubTabNet | agent |
| S71 | CDM (formulas) | arXiv:2409.03643; code github.com/opendatalab/UniMERNet/tree/main/cdm | agent |
| S72 | RMS-F1 (charts) | DePlot, arXiv:2212.10505 §3.1 | agent |
| S73 | SCRM (charts) | StructChart, arXiv:2309.11268 | agent |
| S74 | CER / WER | jiwer, https://github.com/jitsi/jiwer (Apache-2.0) | agent |
| S75 | Canonical-SMILES exact match | MolScribe, arXiv:2205.14311 ("we use RDKit to convert both prediction and ground truth into canonical SMILES"). Tanimoto as in DECIMER [S28], which uses CDK PubChem fingerprints; our RDKit implementation is our own choice | agent |

## Tooling and hosting (dashboard)

| ID | Source | Supports | Checked | How |
|---|---|---|---|---|
| S80 | Vercel fair use, https://vercel.com/docs/limits/fair-use-guidelines | "Hobby teams are restricted to non-commercial personal use only"; code written by a paid employee counts as commercial | 2026-10-22 | direct |
| S81 | Vercel pricing, https://vercel.com/pricing | Pro $20/month per developer seat, includes $20 usage credit | 2026-10-22 | direct |
| S82 | Vercel Python runtime, https://vercel.com/docs/functions/runtimes/python | Python Functions run FastAPI with zero config; Python 3.12 default; 500 MB bundle limit | 2026-10-22 | direct |
| S83 | Next.js static exports, https://nextjs.org/docs/app/guides/static-exports | `output: 'export'` builds plain HTML/JS; no Server Actions, rewrites or request-time rendering | 2026-10-22 | direct |
| S84 | Cloudflare Pages limits, https://developers.cloudflare.com/pages/platform/limits/ | Free plan: 500 builds/month, 20,000 files, 25 MiB per file | 2026-10-22 | direct |
| S85 | Google Cloud Run pricing, https://cloud.google.com/run/pricing | Request-based free tier: 2M requests, 180,000 vCPU-s, 360,000 GiB-s per month; Mumbai and Delhi regions | 2026-10-22 | direct |
| S86 | Neon pricing, https://neon.com/pricing | Free: 1 GB Postgres per project; compute suspends after 5 min idle | 2026-10-22 | direct |
| S87 | Render free tier, https://render.com/docs/free | Spins down after 15 min idle, ~1 min to wake, "Do not use them for production applications" | 2026-10-22 | direct |
| S88 | NVIDIA NIM VLM support matrix, https://docs.nvidia.com/nim/vision-language-models/1.3.2/support-matrix.html | bfloat16 needs compute capability 8.0; T4 is 7.5, so T4 runs use float16 | 2026-10-22 | agent |
| S89 | uv CLI, `uv venv --help` (uv 0.11.28) | `--seed` is needed to install pip into a uv venv | 2026-10-22 | direct |
| S90 | https://huggingface.co/PaddlePaddle/PP-DocLayoutV3 | Layout analysis model; multi-point boxes for non-planar pages; predicts reading order in one pass; part of PaddleOCR-VL-1.5; Apache-2.0; run with `paddleocr.LayoutDetection(model_name="PP-DocLayoutV3")`. Class list and size not on the card | 2026-10-22 | direct |
| S91 | https://github.com/opendatalab/MinerU (README) and LICENSE.md | MinerU 4.0 (`mineru>=4.0,<5`); CPU works (ONNX + llama.cpp), Apple Silicon supported, `full` extra needs a Volta-or-newer NVIDIA GPU with 8 GB+. License: Apache-2.0 plus conditions: separate licence above 100M MAU or USD 20M monthly revenue; online services must state they use MinerU | 2026-10-22 | direct |
| S92 | https://huggingface.co/opendatalab/MinerU2.5-Pro-2604-1.2B | 1.2B, Qwen2-VL architecture, Apache-2.0, Chinese and English; `mineru-vl-utils` `two_step_extract`; transformers or vLLM; no handwriting claim; formula CDM 97.29 (vendor) | 2026-10-22 | direct |
| S93 | https://huggingface.co/scb10x/typhoon-ocr1.5-2b, arXiv:2601.14722 | Typhoon OCR 1.5: built on Qwen3-VL-2B, Apache-2.0, English and Thai; claims improved handwriting (no numbers); works only with its fixed prompt; trained at 1800 px; transformers, vLLM or Ollama; GGUF may lose accuracy | 2026-10-22 | direct |

## Local machine (measured, not a web source)

| ID | Fact | How measured |
|---|---|---|
| M1 | Apple M4, 16 GB RAM | `sysctl machdep.cpu.brand_string hw.memsize`, 2026-10-22 |
| M2 | 7.6 GB free disk | `df -h ~`, 2026-10-22 |
| M3 | System Python 3.14.6; `uv` installed | `python3 --version`, `which uv` |
| M4 | Dataset sizes: dataset1 87 MB, dataset2 228 MB, dataset3 2.6 GB, Digitize-HCD 2.8 GB | `du -sh` |
| M5 | Ground-truth formats (SMILES TSV, chemfig JSON, parquet CXSMILES + cells, COCO + text polygons) | files opened, 2026-10-22 |
