"""Phase 0 smoke test for the challenger models on a Colab / Kaggle T4.

Does each model load and return output on one image? Not a benchmark.
Each model runs in its own process so GPU memory is released between models.

    python benchmark/harness/smoke_colab.py                 # all torch models
    python benchmark/harness/smoke_colab.py --child glm_ocr # one model, in this process

DECIMER needs TensorFlow and Python 3.10, so the notebook runs it in a separate venv
with `--child decimer`.

Loading code follows each model's official card (sources in SOURCES.md):
Qwen3-VL [S31], GLM-OCR [S30], MinerU2.5-Pro [S92], Typhoon OCR 1.5 [S93], Uni-MuMER [S29], DECIMER [S28].
T4 notes: no bfloat16, so float16 everywhere [S88]. Qwen3-VL-8B is ~9B parameters, about 18 GB in
float16, which does not fit in the T4's 15 GB, so it loads in 4-bit (bitsandbytes NF4).
"""

import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEMO = ROOT / "benchmark/api/app/static/demo"
OUT = ROOT / "benchmark/results/smoke_colab"

NEUTRAL_PROMPT = "Extract all text from this image."  # PIPELINE.md: one neutral prompt for prompt-driven models

# Typhoon OCR 1.5 only works with its own prompt [S93]. Copied from the model card, with the
# figure-description language switched from Thai to English (the card's package exposes this
# as `figure_language`).
TYPHOON_PROMPT = """Extract all text from the image.

Instructions:
- Only return the clean Markdown.
- Do not include any explanation or extra text.
- You must include all information on the page.

Formatting Rules:
- Tables: Render tables using <table>...</table> in clean HTML format.
- Equations: Render equations using LaTeX syntax with inline ($...$) and block ($$...$$).
- Images/Charts/Diagrams: Wrap any clearly defined visual areas (e.g. charts, diagrams, pictures) in:

<figure>
Describe the image's main elements (people, objects, text), note any contextual clues (place, event, culture), mention visible text and its meaning, provide deeper analysis when relevant (especially for financial charts, graphs, or documents), comment on style or architecture if relevant, then give a concise overall summary. Describe in English.
</figure>

- Page Numbers: Wrap page numbers in <page_number>...</page_number> (e.g., <page_number>14</page_number>).
- Checkboxes: Use ☐ for unchecked and ☑ for checked boxes."""

# Uni-MuMER's training instruction, from the repo's data.zip (data/CROHME/prompts/crohme_2014.json),
# with a system message "You are a helpful assistant." (scripts/vllm_infer.py).
UNIMUMER_PROMPT = ("I have an image of a handwritten mathematical expression. "
                   "Please write out the expression of the formula in the image using LaTeX format.")

MODELS = {
    "qwen3_vl_8b": "handwritten_text__0001.png",
    "glm_ocr": "handwritten_text__0001.png",
    "mineru_2_5_pro": "handwritten_text__0001.png",
    "typhoon_ocr_1_5_2b": "handwritten_text__0001.png",
    "uni_mumer": "handwritten_formula__0001.png",
    "decimer": "chemistry__0001.png",
}
TORCH_MODELS = [m for m in MODELS if m != "decimer"]


def chat_generate(model, processor, image, prompt, max_new_tokens=1024, system=None):
    messages = ([{"role": "system", "content": system}] if system else []) + [
        {"role": "user", "content": [{"type": "image", "image": image}, {"type": "text", "text": prompt}]}
    ]
    inputs = processor.apply_chat_template(
        messages, tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors="pt"
    ).to(model.device)
    out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    trimmed = out[:, inputs["input_ids"].shape[1]:]
    return processor.batch_decode(trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]


def run_torch(model_id: str, image_path: Path) -> tuple[str, dict]:
    import torch
    from PIL import Image
    from transformers import AutoProcessor

    image = Image.open(image_path).convert("RGB")
    fp16 = dict(dtype=torch.float16, device_map="cuda")
    info: dict = {"dtype": "float16"}

    if model_id == "qwen3_vl_8b":
        from transformers import BitsAndBytesConfig, Qwen3VLForConditionalGeneration
        q = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16)
        model = Qwen3VLForConditionalGeneration.from_pretrained("Qwen/Qwen3-VL-8B-Instruct", quantization_config=q, device_map="cuda")
        processor = AutoProcessor.from_pretrained("Qwen/Qwen3-VL-8B-Instruct")
        info.update(dtype="4-bit NF4 (compute float16)", prompt=NEUTRAL_PROMPT)
        return chat_generate(model, processor, image, NEUTRAL_PROMPT), info

    if model_id == "glm_ocr":
        from transformers import GlmOcrForConditionalGeneration
        model = GlmOcrForConditionalGeneration.from_pretrained("zai-org/GLM-OCR", **fp16)
        processor = AutoProcessor.from_pretrained("zai-org/GLM-OCR")
        info["prompt"] = "Text Recognition:"  # model-only path; the SDK pipeline (with layout) comes in the harness
        return chat_generate(model, processor, image, "Text Recognition:"), info

    if model_id == "typhoon_ocr_1_5_2b":
        from transformers import AutoModelForImageTextToText
        model = AutoModelForImageTextToText.from_pretrained("typhoon-ai/typhoon-ocr1.5-2b", **fp16)
        processor = AutoProcessor.from_pretrained("typhoon-ai/typhoon-ocr1.5-2b")
        w, h = image.size  # card: trained at a fixed 1800 px long side
        s = 1800 / max(w, h)
        image = image.resize((round(w * s), round(h * s)), Image.Resampling.LANCZOS)
        info.update(prompt="typhoon fixed prompt (figure language English)", resized_to=list(image.size))
        return chat_generate(model, processor, image, TYPHOON_PROMPT, max_new_tokens=4096), info

    if model_id == "uni_mumer":
        from transformers import Qwen2_5_VLForConditionalGeneration
        model = Qwen2_5_VLForConditionalGeneration.from_pretrained("phxember/Uni-MuMER-Qwen2.5-VL-3B", **fp16)
        processor = AutoProcessor.from_pretrained("phxember/Uni-MuMER-Qwen2.5-VL-3B")
        info["prompt"] = UNIMUMER_PROMPT
        return chat_generate(model, processor, image, UNIMUMER_PROMPT, max_new_tokens=2048,
                             system="You are a helpful assistant."), info

    if model_id == "mineru_2_5_pro":
        from mineru_vl_utils import MinerUClient
        from mineru_vl_utils.post_process import json2md
        from transformers import Qwen2VLForConditionalGeneration
        mid = "opendatalab/MinerU2.5-Pro-2604-1.2B"
        model = Qwen2VLForConditionalGeneration.from_pretrained(mid, **fp16)
        processor = AutoProcessor.from_pretrained(mid, use_fast=True)
        client = MinerUClient(backend="transformers", model=model, processor=processor)
        blocks = client.two_step_extract(image)
        info["blocks"] = len(blocks)
        return json2md(blocks), info

    raise ValueError(model_id)


def run_decimer(image_path: Path) -> tuple[str, dict]:
    from DECIMER import predict_SMILES
    import tensorflow as tf
    smiles = predict_SMILES(str(image_path), hand_drawn=True)
    return smiles, {"tf_gpus": [d.name for d in tf.config.list_physical_devices("GPU")]}


def run_one(model_id: str) -> dict:
    image_path = DEMO / MODELS[model_id]
    t0 = time.perf_counter()
    if model_id == "decimer":
        text, info = run_decimer(image_path)
        peak = None
    else:
        import torch
        torch.cuda.reset_peak_memory_stats()
        text, info = run_torch(model_id, image_path)
        peak = round(torch.cuda.max_memory_allocated() / 2**20, 1)
    total = time.perf_counter() - t0
    out_dir = OUT / model_id
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "output.txt").write_text(text)
    return {"model_id": model_id, "ok": True, "image": image_path.name, "total_s_incl_load": round(total, 1),
            "peak_gpu_mb": peak, "output_preview": text[:600], **info}


def main() -> None:
    if len(sys.argv) == 3 and sys.argv[1] == "--child":
        print("RESULT " + json.dumps(run_one(sys.argv[2]), ensure_ascii=False))
        return
    OUT.mkdir(parents=True, exist_ok=True)
    summary_path = OUT / "summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else []
    for mid in sys.argv[1:] or TORCH_MODELS:
        print(f"== {mid}", flush=True)
        p = subprocess.run([sys.executable, __file__, "--child", mid], capture_output=True, text=True)
        line = next((ln for ln in p.stdout.splitlines() if ln.startswith("RESULT ")), None)
        res = json.loads(line[7:]) if line else {"model_id": mid, "ok": False, "error": (p.stderr or p.stdout)[-2000:]}
        summary = [s for s in summary if s["model_id"] != mid] + [res]
        print(json.dumps(res, ensure_ascii=False)[:1200], flush=True)
        summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
