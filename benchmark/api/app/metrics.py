"""Small scoring helpers used by the demo seed and the API.

The real benchmark scoring lives in benchmark/eval (PIPELINE.md §6); these match its
definitions closely enough to fill the dashboard.
"""

import re
import unicodedata


def normalize_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    return re.sub(r"\s+", " ", s).strip()


def levenshtein(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def cer(reference: str, hypothesis: str) -> float:
    ref, hyp = normalize_text(reference), normalize_text(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0
    return levenshtein(ref, hyp) / len(ref)


def normalize_latex(s: str) -> str:
    s = re.sub(r"\\[,;:! ]", "", s)
    s = re.sub(r"\\(mathrm|text|mathit)\{([^}]*)\}", r"\2", s)
    return re.sub(r"\s+", "", s)


def label_recall(reference: str, hypothesis: str) -> float:
    labels = [normalize_text(x).lower() for x in reference.splitlines() if x.strip()]
    hyp = normalize_text(hypothesis).lower()
    if not labels:
        return 1.0
    return sum(1 for lab in labels if lab in hyp) / len(labels)


def score(gt_kind: str, category: str, reference: str, hypothesis: str) -> tuple[float, dict]:
    """Return (0-100 score, native metrics) for one prediction."""
    if gt_kind == "latex":
        exact = normalize_latex(reference) == normalize_latex(hypothesis)
        ned = levenshtein(normalize_latex(reference), normalize_latex(hypothesis)) / max(1, len(normalize_latex(reference)))
        return (100.0 if exact else 0.0), {"exact_match": exact, "norm_edit_distance": round(ned, 4)}
    if gt_kind == "smiles":
        exact = reference.strip() == hypothesis.strip()
        return (100.0 if exact else 0.0), {"canonical_exact_match": exact}
    if category == "diagram_labels":
        r = label_recall(reference, hypothesis)
        return round(100 * r, 2), {"label_recall": round(r, 4), "cer": round(cer(reference, hypothesis), 4)}
    c = cer(reference, hypothesis)
    return round(max(0.0, 100 * (1 - c)), 2), {"cer": round(c, 4)}
