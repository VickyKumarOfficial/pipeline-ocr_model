# STAGES.md: Capability checklist definition

Each row is one stage or capability an OCR system can have. For every model, the checklist generator fills in two values per row:

- **Claim**: the documentation says the model has it (with a source), or `--`.
- **Test**: `PASS` / `PARTIAL` / `FAIL` / `N/T`, from running the collected inputs.

**Priority** = how much the stage matters for Niera (H/M/L). This is our judgement, based on Niera's upload types [S1].

**Collect** = the inputs the team must gather to test the stage (PIPELINE.md, Phase 2). Counts are our choice: big enough to see a pattern, small enough to label by hand.

**Status of evidence**:
- `V`: quote copied from the page's raw HTML.
- `S`: quote came through a summarising fetch tool (near-verbatim). Spot-check before publishing.
- `U`: no source found.

Every row was researched on 2026-10-22.

## URL key

| Key | URL |
|---|---|
| P | https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/ |
| M | https://www.paddleocr.ai/latest/en/version3.x/module_usage/ |
| TQ | https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html |
| GDA | https://docs.cloud.google.com/document-ai/docs/enterprise-document-ocr |
| AZR / AZL / AZA | https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/ `prebuilt/read`, `prebuilt/layout`, `concept/add-on-capabilities` |
| AWS / AWB | https://docs.aws.amazon.com/textract/latest/dg/how-it-works-selectables.html, https://docs.aws.amazon.com/textract/latest/APIReference/API_Block.html |
| AB / ABE | http://help.abbyy.com/en-us/finereader/16/user_guide/adjustimage/, https://docs.abbyy.com/fine-reader/engine/introduction/key-new-features/image-preprocessing |
| MU / MU25 | https://github.com/opendatalab/MinerU/blob/release-2.5.4/README.md, https://arxiv.org/html/2509.22186 |
| DLP / DLE | Docling: https://raw.githubusercontent.com/docling-project/docling/main/docling/datamodel/pipeline_options.py, https://docling-project.github.io/docling/usage/enrichments/ |
| MK / SU | https://github.com/datalab-to/marker, https://github.com/datalab-to/surya |
| QW | https://github.com/QwenLM/Qwen3-VL |

---

## F. Input handling

| ID | Stage | Pri | Collect | Source | Ev |
|---|---|---|---|---|---|
| F01 | Phone photo JPG/PNG/HEIC read directly | H | 20 phone photos, including HEIC | P/OCR.html (image inputs) | V |
| F02 | Multi-page PDF, all pages in order | H | 10 PDFs, 3–20 pages | P/PP-StructureV3.html: "For PDF files, each page will be processed individually" | V |
| F03 | Digital PDF: uses the native text layer vs OCRs every page | M | 5 digital PDFs | MinerU CLI "Parsing method: auto (default), txt, ocr"; MK "Force OCR" | V / S |
| F04 | Office files (DOCX/PPTX) | L | 5 files | PaddleOCR doc2md [S23]; AZR | S |
| F05 | Large images: tiling / dynamic resolution | M | 5 images over 4000 px | MU25 ("upper bound of 2048×28×28 pixels"); QW ("min_pixels and max_pixels") | S |
| F06 | Batch / folder input | L | — | P/OCR.html: "Local directory, which must contain images" | V |

## P. Image pre-processing

| ID | Stage | Pri | Collect | Source | Ev |
|---|---|---|---|---|---|
| P01 | Image quality score (blur, glare, dark, cut-off) | M | 10 bad-quality photos | GDA: "Image-quality score … in eight dimensions" | S |
| P02 | Page orientation 0/90/180/270 | H | 20 photos, 5 per angle | P/doc_preprocessor.html: "four possible orientations" | V |
| P03 | Deskew (small tilt) | H | 10 tilted 5–20° | TQ; GDA "deskew documents" | V / S |
| P04 | Dewarping (curved book page) | H | 10 curved pages | M/text_image_unwarping.html (UVDoc) | V |
| P05 | Perspective correction / page crop | H | 10 photos taken at an angle | AB "Corrects trapezoid distortions" | S |
| P06 | Shadow / uneven lighting removal | H | 10 shadowed photos | BEDSR-Net (CVPR 2020); arXiv 2110.12942 | S |
| P07 | Denoise / despeckle | M | 5 noisy scans | ABE; TQ | S / V |
| P08 | Deblur | M | 5 motion-blurred photos | ABBYY RemoveMotionBlur | S |
| P09 | Low-resolution text / super-resolution | M | 5 low-resolution images | TextZoom, arXiv 2005.03341 | S |
| P10 | Border / background removal | L | 5 scans with dark borders | TQ | V |
| P11 | Pen-mark / stamp removal before OCR | M | 5 pages with teacher red-pen marks | AB "Removes any color stamps and marks made in pen" | S |
| P12 | Split two-page spread | L | 3 book spreads | AB | S |
| P13 | Contrast enhancement | L | — | none found | U |

## L. Layout and structure

| ID | Stage | Pri | Collect | Source | Ev |
|---|---|---|---|---|---|
| L01 | Layout detection (text/title/table/formula/figure/chart…) | H | 20 module pages + 20 answer sheets | M/layout_detection.html ("20 common categories"); DocLayNet | V |
| L02 | Figure sub-type (image / chart / chemical structure) | H | 10 pages with mixed figures | MU25: "image, chart, and chemical_structure" | S |
| L03 | Reading order, multi-column | H | 10 two-column module pages | P/PP-StructureV3.html: "multi-column reading order recovery" | V |
| L04 | Header / footer / page-number filtering | M | same as L03 | P/PP-StructureV3.html (`markdown_ignore_labels`) | V |
| L05 | Footnotes kept as content | L | 3 pages | olmOCR prompt: "keep references and footnotes" | S |
| L06 | Caption linked to its figure/table | M | 5 pages | MU (implied only) | S / weak |
| L07 | Heading hierarchy (title levels) | M | 5 chapter PDFs | MU | S |
| L08 | List detection | L | 3 pages | Docling labels `LIST_ITEM` | S |
| L09 | Cross-page table merge | L | 3 PDFs | P/PaddleOCR-VL.html (`restructure_pages`) [S7] | V |
| L10 | Rotated table | L | 3 pages | AZL; MU "270-degree rotated table parsing" | S |
| L11 | Question/answer-region segmentation on answer sheets | H | 20 answer sheets | none found for this exact task | U |

## T. Text

| ID | Stage | Pri | Collect | Source | Ev |
|---|---|---|---|---|---|
| T01 | Text detection: line / word polygons | H | covered by T03–T05 inputs | P/OCR.html (`dt_polys`) [S10] | V |
| T02 | Upside-down / vertical line handling | M | 5 images | M/textline_orientation_classification.html ("0 degrees and 180 degrees") | V |
| T03 | Printed English recognition | H | 20 module pages | P/OCR.html | V |
| T04 | Handwritten English recognition | H | 30 answer-sheet photos | P/OCR.html: "handwriting, vertical text…" | V |
| T05 | Printed + handwritten on one page, tagged per line | H | 15 marked answer sheets | AZR: "classifying whether each text line is of handwriting style"; AWB | S |
| T06 | Hindi / Devanagari | H if in scope | 15 Hindi pages | devanagari_PP-OCRv5_mobile_rec [S19]; PP-OCRv6 has no Devanagari [S11] | V |
| T07 | Hindi–English code-mixed text | H if in scope | 10 Hinglish pages | AZR (mixed languages); no OCR-specific dataset found | S |
| T08 | Script / language identification per line | L | uses T06/T07 inputs | TQ (OSD); AZA | V / S |
| T09 | Word-level boxes | M | — | P/OCR.html `return_word_box` | V |
| T10 | Confidence score per line/word/token | H | — | P/OCR.html `rec_scores`; SU (per-token) | V / S |
| T11 | Crossed-out / strikethrough text detected | H | 15 answer sheets with crossings-out | AWS "Crossed Out Words"; arXiv 2201.09633 | S |
| T12 | Underlined / circled text detected | M | 5 pages | AWS "underlined, and circled text" | S |
| T13 | Checkbox / bubble (OMR) state | M | 5 OMR sheets | AZL; GDA | S |
| T14 | Seal / stamp text | L | — | P/seal_recognition.html | V |
| T15 | Text spotting (detect + recognise jointly) | L | — | PaddleOCR-VL-1.5 "Spotting:" prompt [S35] | V |
| T16 | Font style / bold / handwriting attribute | L | — | GDA | S |

## X. Special content (Niera core)

| ID | Stage | Pri | Collect | Source | Ev |
|---|---|---|---|---|---|
| X01 | Printed formula → LaTeX | H | 20 module pages with equations | P/formula_recognition.html [S12] | V |
| X02 | Handwritten formula → LaTeX | H | 30 handwritten maths/physics answers | M/formula_recognition.html (UniMERNet); Uni-MuMER [S29] | V / S |
| X03 | Inline vs display formula tagged | M | uses X01 inputs | AZA: "formula type as inline or display" | S |
| X04 | Chemical equation (reactions, mhchem) | H | 15 printed + 15 handwritten | none found | U |
| X05 | Chemical structure → SMILES | H | 15 printed + 15 hand-drawn | DECIMER [S28]; Mathpix image-to-SMILES | S |
| X06 | Table → HTML/Markdown (wired/wireless, merged cells) | M | 10 tables | P/table_recognition_v2.html; Textract tables | V / S |
| X07 | Printed chart → data table | M | 10 charts | M/chart_parsing.html (off by default) | V |
| X08 | Hand-drawn chart/graph → data | H | 15 hand-drawn graphs | ChartArena [S27] | V |
| X09 | Figure/diagram detected and cropped | H | 20 pages with diagrams | DLP ("categorize images by type") | S |
| X10 | Figure description / caption generation | M | uses X09 inputs | DLE ("annotate a picture with a vision model") | S |
| X11 | Labels inside diagrams read (e.g. ray diagram, circuit labels) | H | uses X09 inputs | none found as a named stage | U |
| X12 | Circuit diagram → components | M | 10 hand-drawn circuits | arXiv 2107.10373; [S60] | S |
| X13 | Flowchart / diagram → structure | L | 5 flowcharts | arXiv 2501.17441, 2401.03742 | S |

## O. Output and post-processing

| ID | Stage | Pri | Collect | Source | Ev |
|---|---|---|---|---|---|
| O01 | Structured output: Markdown / JSON / HTML / DOCX / LaTeX | H | — | [S8]; Docling; MinerU | V / S |
| O02 | Grounding: each output piece linked to its box | H | — | P/PaddleOCR-VL.html `block_bbox`; dots.ocr | S |
| O03 | Dictionary / LLM correction | L | — | TQ; MK `--use_llm` | V / S |
| O04 | Key-value / key-information extraction | L | — | P/PP-ChatOCRv4.html (needs an LLM) | V |

## R. Robustness and hallucination

VLMs can invent text, and CER can miss it (OmniDocBench repo; arXiv 2506.20168; arXiv 2510.19817 olmOCR-Bench "repeated n-grams" check).

| ID | Stage | Pri | Collect | Source | Ev |
|---|---|---|---|---|---|
| R01 | Blank page → empty output | H | 5 blank pages | arXiv 2506.20168 ("refusal to answer") | S |
| R02 | Photo with no text → no invented text | H | 5 non-text photos | same | S |
| R03 | No repetition loops | H | all inputs (automatic check) | arXiv 2510.19817 | S |
| R04 | Illegible handwriting → low confidence / marked unclear, not a guess | H | 10 very messy samples | arXiv 2506.20168 | S |

## D. Deployment

| ID | Stage | Pri | Source | Ev |
|---|---|---|---|---|
| D01 | Runs offline on Apple Silicon | H | [S6]; MU (MPS) | V / S |
| D02 | Quantised build available | M | QW (FP8); PaddleOCR INT8 not found | S |
| D03 | Fast backend (OpenVINO/ONNX/TensorRT/vLLM) | M | `inference_deployment/local_inference/high_performance_inference.html` | V |
| D04 | Official fine-tuning recipe | H | P/OCR.html; [S21] [S22]; Qwen3-VL fine-tuning code not found | V |
| D05 | Commercial license (code + weights) | H | [S2] [S14] [S30] [S31] | V |

---

## How models are ranked (not by counting PASS)

Counting supported stages does not predict quality:

| Evidence | Detail | Source |
|---|---|---|
| Modular pipeline vs VLM, OmniDocBench v1.5 overall | PP-StructureV3, a modular pipeline with many explicit stages: 86.73. PaddleOCR-VL: 92.86. GLM-OCR: 94.62. | GLM-OCR report arXiv 2603.10910, Table 4 (agent-read) |
| Benchmarks disagree | On olmOCR-Bench, Marker (76.1) beats DeepSeek-OCR (75.7) | olmOCR README |
| Phone photos | On photographed pages, PP-StructureV3 falls to 64.45 while VLM hybrids score 85–92 | PaddleOCR-VL-1.5 report arXiv 2601.21957, Table 3 (agent-read, Paddle-authored) |
| An optional stage can hurt | Binarisation hurts CRNN recognisers | arXiv 2008.02777 |
| An optional stage can hurt | A community report shows unwarping shifting downstream crops | PaddleOCR issue #18347 |

So the report ranks models in this order:

1. **Accuracy on the collected inputs.** This alone decides the winner.
2. **Weighted capability score.** Only `PASS` counts, never a bare claim. H = 3 points, M = 2, L = 1. `PARTIAL` earns half.
3. **Ablation for each optional stage.** Run the model with the stage on and off. A stage scores only if turning it on improves accuracy. A stage that exists but does not help earns 0.
4. **Hallucination (R01–R04) is a gate, not a score.** A model that fails R01–R03 is flagged, whatever its other scores.
