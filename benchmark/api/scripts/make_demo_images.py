"""Draw the DEMO sample images and write their ground truth.

These are stand-ins so the dashboard can be built before real inputs exist.
All text is written for this demo (no NCERT text is copied). Run once:

    uv run python scripts/make_demo_images.py
"""

import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "app" / "static" / "demo"
OUT_JSON = ROOT / "app" / "data" / "demo_samples.json"

FONT_DIR = Path("/System/Library/Fonts")
HAND_FONTS = [
    (FONT_DIR / "Noteworthy.ttc", 0),
    (FONT_DIR / "Supplemental" / "Bradley Hand Bold.ttf", 0),
    (FONT_DIR / "MarkerFelt.ttc", 1),
    (FONT_DIR / "Supplemental" / "Chalkboard.ttc", 0),
]
PRINT_FONT = (FONT_DIR / "Supplemental" / "Times New Roman.ttf", 0)

PAPER = (250, 251, 252)
RULE = (196, 214, 236)
MARGIN = (232, 150, 150)
INK = (28, 52, 140)
GRAPHITE = (55, 58, 66)
PRINT_INK = (24, 24, 28)

W, H = 1100, 720
rng = random.Random(11)


def font(spec, size):
    path, index = spec
    return ImageFont.truetype(str(path), size, index=index)


def ruled_page(margin=True):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    for y in range(70, H, 46):
        d.line([(0, y), (W, y)], fill=RULE, width=1)
    if margin:
        d.line([(92, 0), (92, H)], fill=MARGIN, width=2)
    return img, d


def plain_page():
    img = Image.new("RGB", (W, H), PAPER)
    return img, ImageDraw.Draw(img)


def write_lines(d, lines, spec, size, x0=118, y0=58, step=92, ink=INK, jitter=True):
    """Write lines of text; return [{"text", "poly"}] in pixel coordinates."""
    f = font(spec, size)
    out = []
    y = y0
    for text in lines:
        x = x0 + (rng.randint(-6, 10) if jitter else 0)
        yy = y + (rng.randint(-4, 4) if jitter else 0)
        d.text((x, yy), text, font=f, fill=ink)
        l, t, r, b = d.textbbox((x, yy), text, font=f)
        out.append({"text": text, "poly": [[l - 4, t - 4], [r + 4, t - 4], [r + 4, b + 4], [l - 4, b + 4]]})
        y += step
    return out


def photo_feel(img, blur=0.6):
    """Slight blur and uneven light so it reads as a phone photo, not a render."""
    img = img.filter(ImageFilter.GaussianBlur(blur))
    shade = Image.new("L", img.size, 0)
    sd = ImageDraw.Draw(shade)
    cx, cy = rng.randint(0, W), rng.randint(0, H)
    for r in range(900, 0, -60):
        sd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=int(28 * (r / 900)))
    dark = Image.new("RGB", img.size, (0, 0, 0))
    return Image.composite(dark, img, shade.filter(ImageFilter.GaussianBlur(80)))


SAMPLES = []


def save(sample_id, category, img, gt, gt_kind, stage_ids, lines, source):
    name = sample_id.replace("/", "__") + ".png"
    path = OUT_DIR / name
    img.save(path, optimize=True)
    data = path.read_bytes()
    SAMPLES.append({
        "id": sample_id,
        "category": category,
        "stage_ids": stage_ids,
        "file_format": "png",
        "sha256": hashlib.sha256(data).hexdigest(),
        "image_file": name,
        "width": img.width,
        "height": img.height,
        "source": source,
        "license": "demo (made for this dashboard)",
        "ground_truth": gt,
        "gt_kind": gt_kind,
        "lines": lines,
    })


# Handwritten answers ---------------------------------------------------------
HANDWRITTEN = [
    ["Q3. A body is thrown up with speed 20 m/s.", "Time to reach the top = u/g = 20/10 = 2 s", "Max height = u^2/2g = 400/20 = 20 m", "So the body rises 20 m before falling."],
    ["Ans: Photosynthesis needs sunlight,", "chlorophyll, carbon dioxide and water.", "Oxygen is given out as a by-product.", "It happens mostly in the leaves."],
    ["Ohm's law: V = IR at constant temperature.", "Here R = 12 ohm and I = 0.5 A", "so V = 12 x 0.5 = 6 V", "The bulb glows less when R increases."],
    ["Mendeleev arranged elements by atomic mass.", "He left gaps for undiscovered elements", "like gallium and germanium.", "Modern table uses atomic number."],
    ["Q7. Why is the sky blue?", "Air molecules scatter blue light more", "than red light because blue has a", "shorter wavelength. (Rayleigh)"],
    ["Mitochondria is the powerhouse of cell.", "It makes ATP by cellular respiration.", "It has its own DNA and ribosomes.", "Number is high in muscle cells."],
]
for i, lines in enumerate(HANDWRITTEN, 1):
    img, d = ruled_page()
    spec = HAND_FONTS[i % len(HAND_FONTS)]
    boxes = write_lines(d, lines, spec, 40 if i % 2 else 44)
    save(f"handwritten_text/{i:04d}", "handwritten_text", photo_feel(img), {"text": "\n".join(lines)}, "text",
         ["F01", "T04", "T05"], boxes, "demo: drawn answer sheet")

# Handwritten formulas ----------------------------------------------------------
FORMULAS = [
    ("v² = u² + 2as", r"v^{2}=u^{2}+2as"),
    ("F = G m₁m₂ / r²", r"F=\frac{Gm_{1}m_{2}}{r^{2}}"),
    ("∫₀¹ x² dx = 1/3", r"\int_{0}^{1}x^{2}\,dx=\frac{1}{3}"),
    ("pH = −log[H⁺]", r"\mathrm{pH}=-\log[\mathrm{H}^{+}]"),
    ("λ = h / mv", r"\lambda=\frac{h}{mv}"),
]
for i, (shown, latex) in enumerate(FORMULAS, 1):
    img, d = ruled_page(margin=False)
    spec = (FONT_DIR / "Supplemental" / "Arial Unicode.ttf", 0) if any(ch in shown for ch in "∫₀¹₁₂⁺λ−") else HAND_FONTS[i % 4]
    boxes = write_lines(d, [shown], spec, 72, x0=170, y0=280, ink=INK)
    save(f"handwritten_formula/{i:04d}", "handwritten_formula", photo_feel(img, 0.9), {"latex": latex}, "latex",
         ["X02"], boxes, "demo: drawn formula")

# Printed text ---------------------------------------------------------------------
PRINTED = [
    ["When a ray of light passes from air into glass,", "it bends towards the normal. This bending", "is called refraction, and the amount of", "bending depends on the refractive index."],
    ["A solution in which no more solute can be", "dissolved at a given temperature is called", "a saturated solution. Heating usually lets", "more of the solid dissolve."],
    ["The force of attraction between the Earth", "and a body is called its weight. Weight", "changes from place to place, but the mass", "of the body stays the same."],
]
for i, lines in enumerate(PRINTED, 1):
    img, d = plain_page()
    boxes = write_lines(d, lines, PRINT_FONT, 42, x0=90, y0=120, step=70, ink=PRINT_INK, jitter=False)
    save(f"printed_text/{i:04d}", "printed_text", photo_feel(img, 0.4), {"text": "\n".join(lines)}, "text",
         ["T03", "L03"], boxes, "demo: printed page")

# Printed formulas ----------------------------------------------------------------
for i, (shown, latex) in enumerate([("E = mc²", r"E=mc^{2}"), ("P = V² / R", r"P=\frac{V^{2}}{R}")], 1):
    img, d = plain_page()
    boxes = write_lines(d, [shown], (FONT_DIR / "Supplemental" / "Arial Unicode.ttf", 0), 70, x0=330, y0=300,
                        ink=PRINT_INK, jitter=False)
    save(f"printed_formula/{i:04d}", "printed_formula", photo_feel(img, 0.3), {"latex": latex}, "latex",
         ["X01"], boxes, "demo: printed formula")


# Diagrams -------------------------------------------------------------------------
def label(d, xy, text, spec, size=34):
    f = font(spec, size)
    d.text(xy, text, font=f, fill=INK)
    l, t, r, b = d.textbbox(xy, text, font=f)
    return {"text": text, "poly": [[l - 4, t - 4], [r + 4, t - 4], [r + 4, b + 4], [l - 4, b + 4]]}


# Convex lens ray diagram
img, d = plain_page()
d.line([(60, 380), (1040, 380)], fill=GRAPHITE, width=2)
d.ellipse([530, 170, 570, 590], outline=GRAPHITE, width=3)
d.line([(250, 380), (250, 270)], fill=INK, width=4)
d.line([(250, 270), (550, 270), (830, 480)], fill=INK, width=2)
d.line([(250, 270), (830, 480)], fill=INK, width=2)
d.line([(830, 380), (830, 480)], fill=INK, width=4)
spec = HAND_FONTS[0]
boxes = [label(d, (215, 225), "Object", spec), label(d, (790, 495), "Image", spec), label(d, (410, 390), "F", spec),
         label(d, (680, 390), "F", spec), label(d, (290, 390), "2F", spec), label(d, (580, 140), "Convex lens", spec)]
save("diagram_labels/0001", "diagram_labels", photo_feel(img), {"text": "\n".join(b["text"] for b in boxes)}, "text",
     ["X09", "X11"], boxes, "demo: drawn ray diagram")

# Circuit
img, d = plain_page()
d.rectangle([200, 180, 900, 560], outline=GRAPHITE, width=3)
d.rectangle([420, 160, 580, 200], fill=PAPER, outline=INK, width=3)  # resistor
d.line([(180, 340), (220, 340)], fill=PAPER, width=8)
d.line([(170, 330), (230, 330)], fill=INK, width=4)  # cell
d.line([(185, 350), (215, 350)], fill=INK, width=4)
d.ellipse([860, 330, 940, 410], outline=INK, width=3)
spec = HAND_FONTS[1]
boxes = [label(d, (450, 110), "R = 4 ohm", spec), label(d, (60, 300), "6 V", spec), label(d, (887, 345), "A", spec, 36),
         label(d, (500, 575), "Key K", spec)]
save("diagram_labels/0002", "diagram_labels", photo_feel(img), {"text": "\n".join(b["text"] for b in boxes)}, "text",
     ["X09", "X11", "X12"], boxes, "demo: drawn circuit")

# Labelled cell
img, d = plain_page()
d.ellipse([300, 150, 800, 570], outline=GRAPHITE, width=3)
d.ellipse([480, 300, 600, 400], outline=INK, width=3)
d.ellipse([360, 220, 430, 260], outline=INK, width=2)
spec = HAND_FONTS[3]
d.line([(600, 350), (860, 300)], fill=INK, width=2)
d.line([(430, 240), (180, 200)], fill=INK, width=2)
d.line([(790, 470), (900, 520)], fill=INK, width=2)
boxes = [label(d, (870, 280), "Nucleus", spec), label(d, (50, 170), "Mitochondria", spec), label(d, (880, 525), "Cell membrane", spec, 30)]
save("diagram_labels/0003", "diagram_labels", photo_feel(img), {"text": "\n".join(b["text"] for b in boxes)}, "text",
     ["X09", "X11"], boxes, "demo: drawn cell diagram")


# Chemistry --------------------------------------------------------------------------
def hexagon(d, cx, cy, r, inner=True):
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(30, 390, 60)]
    d.line(pts + [pts[0]], fill=INK, width=4)
    if inner:
        d.ellipse([cx - r * 0.55, cy - r * 0.55, cx + r * 0.55, cy + r * 0.55], outline=INK, width=3)
    return pts


img, d = plain_page()
pts = hexagon(d, 500, 380, 150)
top = pts[4]
d.line([top, (top[0], top[1] - 90)], fill=INK, width=4)
boxes = [label(d, (top[0] - 30, top[1] - 160), "OH", HAND_FONTS[0], 48)]
save("chemistry/0001", "chemistry", photo_feel(img), {"smiles": "Oc1ccccc1"}, "smiles", ["X05"], boxes,
     "demo: hand-drawn phenol")

img, d = plain_page()
chain = [(250, 420), (400, 320), (550, 420), (700, 320)]
d.line(chain[:3], fill=INK, width=4)
d.line([chain[2], (650, 352)], fill=INK, width=4)
boxes = [label(d, (660, 290), "OH", HAND_FONTS[1], 48)]
save("chemistry/0002", "chemistry", photo_feel(img), {"smiles": "CCCO"}, "smiles", ["X05"], boxes,
     "demo: hand-drawn propan-1-ol")

# Table ------------------------------------------------------------------------------
img, d = plain_page()
rows = [["Metal", "Reacts with water?"], ["Sodium", "Yes, fast"], ["Iron", "Slowly, with steam"], ["Gold", "No"]]
x_cols = [120, 420, 980]
y0, rh = 130, 100
for r in range(len(rows) + 1):
    d.line([(x_cols[0], y0 + r * rh), (x_cols[-1], y0 + r * rh)], fill=GRAPHITE, width=2)
for x in x_cols:
    d.line([(x, y0), (x, y0 + len(rows) * rh)], fill=GRAPHITE, width=2)
boxes = []
for r, row in enumerate(rows):
    for c, cell in enumerate(row):
        boxes.append(label(d, (x_cols[c] + 24, y0 + r * rh + 28), cell, HAND_FONTS[2], 34))
gt = "\n".join(" | ".join(row) for row in rows)
save("tables/0001", "tables", photo_feel(img), {"text": gt}, "text", ["X06"], boxes, "demo: drawn table")

OUT_JSON.write_text(json.dumps(SAMPLES, indent=1, ensure_ascii=False))
print(f"wrote {len(SAMPLES)} samples to {OUT_DIR}")
