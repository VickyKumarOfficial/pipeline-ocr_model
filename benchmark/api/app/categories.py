"""Score categories shown on the leaderboard.

Every score is 0-100 and higher is better, so columns can be compared at a glance.
The native metric (CER, ExpRate, ...) is kept in Prediction.metrics.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Category:
    id: str
    label: str
    metric: str  # what the 0-100 score means
    focus: bool  # one of Niera's three focus areas (README)
    stage_ids: tuple[str, ...]
    gt_kind: str


CATEGORIES: tuple[Category, ...] = (
    Category("handwritten_text", "Handwritten text", "Character accuracy (100 − CER)", True, ("T04", "T05"), "text"),
    Category("handwritten_formula", "Handwritten formulas", "Exact-match rate (ExpRate)", True, ("X02",), "latex"),
    Category("diagram_labels", "Diagram labels", "Label recall", True, ("X09", "X11"), "text"),
    Category("printed_text", "Printed text", "Character accuracy (100 − CER)", False, ("T03",), "text"),
    Category("printed_formula", "Printed formulas", "Exact-match rate (ExpRate)", False, ("X01",), "latex"),
    Category("chemistry", "Chemical structures", "Canonical SMILES exact match", False, ("X05",), "smiles"),
    Category("hindi", "Hindi text", "Character accuracy (100 − CER)", False, ("T06", "T07"), "text"),
    Category("tables", "Tables", "TEDS", False, ("X06",), "text"),
)

BY_ID = {c.id: c for c in CATEGORIES}
FOCUS_IDS = tuple(c.id for c in CATEGORIES if c.focus)
