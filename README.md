# Niera OCR Benchmark: Open-Source OCR Models, PaddleOCR First

Tags like `[S7]` point to rows in [SOURCES.md](SOURCES.md). A statement with no tag is our own plan or judgement, not a sourced fact.

## Why this exists

[Niera](https://niera.in) is an AI tutor for NCERT, JEE and NEET. Students upload coaching modules, PDFs and their own marked answer sheets, and Niera answers from that material [S1]. All of this depends on OCR.

Niera uses an API-based OCR service today. The team wants to know whether an open-source model can match or beat it. The content that matters most:

- handwritten text
- equations and formulas, printed and handwritten
- hand-drawn charts, figures, diagrams and shapes (chemical structures, circuit diagrams)

If an open model comes close, we fine-tune it on Niera-style data and replace the API.

## What this task delivers

1. **One end-to-end benchmark pipeline.** It runs every candidate model locally from one command, on exactly the same inputs.
2. **Model internals documentation.** For each model: how it works, its internal stages, and which sub-model runs at each stage.
3. **One capability checklist.** A generated text file that lists every stage (orientation, unwarping, layout, detection, recognition, formula, table, chart, and so on) against every model. Each cell separates "documentation claims" from "we measured".
4. **A comparison report** against the current API baseline.

## Evidence that changes the original scope

The original brief was "pick the best PaddleOCR model". The evidence says PaddleOCR alone does not cover Niera's priority content. Recommendation: **PaddleOCR stays the main candidate, and a small set of non-Paddle challengers is added**, so we do not fine-tune the wrong base model.

| Priority content | What the evidence says | Source |
|---|---|---|
| Printed pages / PDFs | PaddleOCR-VL-1.6 is #3 on the OmniDocBench leaderboard (96.34), and it is 0.9B and Apache-2.0. Strong lead candidate. | [S25] [S14] |
| Handwritten text | On an independent handwriting benchmark, PaddleOCR-VL (v1) scores 60.85 and Qwen3-VL-8B scores 72.16. Paddle's own table puts PP-OCRv6_medium at 67.8 on handwritten English, below Qwen3-VL-235B (73.2). VL-1.6 has not been tested independently on handwriting. | [S26] [S11] |
| Handwritten math | PP-FormulaNet publishes BLEU only on an internal test set, with no handwritten split. Uni-MuMER publishes about 80% ExpRate on CROHME 2019. | [S12] [S29] |
| Hand-drawn charts | PaddleOCR-VL (v1) drops from 50.2 to 25.7 going from digital to hand-drawn numeric charts. Qwen3-VL-8B drops from 49.5 to 46.6. | [S27] |
| Hand-drawn chemical structures | No PaddleOCR doc, model card or README mentions chemical structure recognition. The DECIMER hand-drawn model (MIT) reports 73.25% exact match on our DECIMER set. | [S2] [S28] |
| Hand-drawn circuits | No PaddleOCR support. Published pipelines detect components with YOLO; the code we found is research-only. | [S60] |
| Hindi | PP-OCRv6 covers no Devanagari. `devanagari_PP-OCRv5_mobile_rec` and PaddleOCR-VL do. | [S11] [S19] [S2] |

Proposed challengers (team decision; see PIPELINE.md §2, Phase 1):

1. **Qwen3-VL-8B** (4-bit MLX): control for handwriting and sketches [S26] [S27]. License to confirm [S31].
2. **GLM-OCR** (0.9B, MIT): printed-document control from outside PaddleOCR [S30].
3. **DECIMER hand-drawn** (MIT): chemistry branch [S28].
4. **Uni-MuMER**: handwritten-math challenger. Needs a legal check first, because its training bundle includes MathWriting (non-commercial) [S29] [S54].

Leading systems already route content this way: first a layout step, then a specialist model for each region type. PaddleOCR-VL and PP-StructureV3 both work like that [S7] [S8] [S17]. A Niera pipeline built on that pattern can plug DECIMER or a circuit detector in after layout detection. This is our design proposal. No published system routes regions to chemistry or circuit models.

## Fairness rules (short version)

- Every model reads the same frozen file list. The SHA-256 hash of every input is checked before inference.
- No model-specific pre-processing. If a model resizes internally, that is part of the model.
- Each model runs twice: library defaults, and every optional stage on. Many stages are off by default, for example chart, seal, orientation and unwarping in PP-StructureV3 [S8].
- Same machine, same scoring code, same text normalisation, including for the API baseline.

PIPELINE.md §0 has the full rules.

## Candidate models

### PaddleOCR (PaddleOCR 3.7.0 is the latest release, 2026-06-11 [S2] [S3])

| Model / pipeline | What it is | Runs on this Mac (M4, 16 GB)? |
|---|---|---|
| PP-OCRv6 tiny / small / medium | Detection + recognition OCR. Chinese, English, Japanese and 46 Latin-script languages [S11] | Yes |
| PP-OCRv5 server / mobile, `en_PP-OCRv5_mobile_rec`, `devanagari_PP-OCRv5_mobile_rec` | Previous generation. Handwriting claim [S20] [S10]; Hindi model [S19] | Yes |
| PP-StructureV3 | Modular document parser. Defaults: PP-DocLayout_plus-L, PP-FormulaNet_plus-L, **PP-OCRv5_server OCR (not v6)** [S9] | Yes, CPU |
| PaddleOCR-VL-1.6 (and 1.5) | 0.9B VLM after a PP-DocLayoutV3 layout step [S9] [S14] | Yes. Local runs use the Paddle CPU engine. MLX-VLM works only as a separate server [S6] |
| Formula pipeline (PP-FormulaNet_plus-S/M/L, UniMERNet) | Image to LaTeX [S12] | Yes |
| PP-Chart2Table | Chart to table, inside PP-StructureV3 [S8] | Yes |
| HPD-Parsing | High-throughput VLM parser | **No.** NVIDIA + Linux only [S13] |
| PP-ChatOCRv4 | Key-information extraction that calls an LLM (ERNIE) API [S2] | Excluded: not offline OCR |

### Challengers: see "Evidence that changes the original scope" above.

## Input data

**The local datasets in `Chemistry/` and `Physics/` are not used** (team decision 2026-10-22). Models are tested on raw files collected later to the collection spec in PIPELINE.md §3.3. Files go to each model unconverted.

License notes, if public sets are used for collection later: IAM, CROHME, MathWriting and OmniDocBench are non-commercial [S44] [S46] [S47] [S54] [S55]. NCERT PDFs cannot be copied [S57].

## Machine constraints [M1–M3]

- Apple M4, 16 GB RAM, **7.6 GB free disk**. Free space before downloading any models.
- System Python is 3.14. No paddlepaddle release ships Python 3.14 wheels [S5]. Use `uv` with Python 3.12.

## Folder layout (target)

```
OCR_DataSets/
├── README.md        this file
├── PIPELINE.md      working plan: phases, rules, schemas, checklists
├── SOURCES.md       evidence register (every [S#] tag)
├── STAGES.md        capability checklist definition + collection spec + ranking method
├── Chemistry/ Physics/   local datasets, NOT used by the pipeline
└── benchmark/       configs, data manifest, runners, eval, scripts, docs/models, results, reports
```

## Status

- [x] Scope, models and datasets identified; sources registered
- [ ] Team decision on challengers and open questions
- [ ] Phases 0–7 (see PIPELINE.md)

## Open questions for the team

1. Which API does Niera use today? It is not publicly identifiable. Are we allowed to send benchmark images to it?
2. Is Hindi / Hinglish handwriting in scope? The answer changes which models we test [S11] [S19].
3. Can we get 200–300 real student uploads, with consent and anonymised, and label them?
4. Legal: may non-commercial datasets be used for *internal evaluation* of a commercial product? Treat the answer as "no" until legal confirms.
5. Is a cloud NVIDIA GPU available, for HPD-Parsing and for fine-tuning?
