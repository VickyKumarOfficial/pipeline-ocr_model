"""Parse the stage tables in STAGES.md into app/data/stages.json.

STAGES.md stays the source of truth; rerun this after editing it:

    uv run python scripts/export_stages.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGES_MD = ROOT.parents[1] / "STAGES.md"
OUT = ROOT / "app" / "data" / "stages.json"

GROUP_NAMES = {}
stages = []
group = None
for line in STAGES_MD.read_text().splitlines():
    heading = re.match(r"^## ([A-Z])\. (.+)$", line)
    if heading:
        group = heading.group(1)
        GROUP_NAMES[group] = heading.group(2).strip()
        continue
    row = re.match(r"^\| ([A-Z]\d{2}) \|(.+)\|\s*$", line)
    if not (row and group):
        continue
    cells = [c.strip() for c in row.group(2).split("|")]
    if group == "D":  # deployment table has no "Collect" column
        name, priority, source, evidence = cells
        collect = ""
    else:
        name, priority, collect, source, evidence = cells
    stages.append({
        "id": row.group(1),
        "group": group,
        "name": name,
        "priority": priority,
        "collect": collect,
        "source": source,
        "evidence": evidence,
        "position": len(stages),
    })

OUT.write_text(json.dumps({"groups": GROUP_NAMES, "stages": stages}, indent=1, ensure_ascii=False))
print(f"{len(stages)} stages in {len(GROUP_NAMES)} groups -> {OUT}")
