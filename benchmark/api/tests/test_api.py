"""API tests against the demo database (DATABASE_URL unset)."""

import os

os.environ.pop("DATABASE_URL", None)

from fastapi.testclient import TestClient  # noqa: E402

from app import metrics  # noqa: E402
from app.categories import FOCUS_IDS  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def test_cer_and_scores():
    assert metrics.cer("abcd", "abcd") == 0
    assert metrics.cer("abcd", "abxd") == 0.25
    # Whitespace and NFKC differences are normalised away.
    assert metrics.cer("a  b", "a b") == 0
    assert metrics.score("latex", "printed_formula", r"E=mc^{2}", r"E = mc^{2}")[0] == 100.0
    assert metrics.score("text", "diagram_labels", "Object\nImage", "Object only")[0] == 50.0


def test_overview_ranks_only_full_coverage_models():
    data = client.get("/api/overview").json()
    assert data["run"]["is_demo"] is True
    ranked = [r for r in data["rows"] if r["rank"] is not None]
    assert ranked, "expected at least one ranked model"
    assert all(r["focus_coverage"] == len(FOCUS_IDS) for r in ranked)
    scores = [r["focus_score"] for r in ranked]
    assert scores == sorted(scores, reverse=True)
    assert [r["rank"] for r in ranked] == list(range(1, len(ranked) + 1))


def test_pending_baseline_has_no_scores():
    rows = client.get("/api/overview").json()["rows"]
    baseline = next(r for r in rows if r["model"]["id"] == "niera_production")
    assert baseline["rank"] is None
    assert all(s["score"] is None for s in baseline["scores"])


def test_config_filter_validated():
    assert client.get("/api/overview?config=full").status_code == 200
    assert client.get("/api/overview?config=bogus").status_code == 422


def test_checklist_covers_every_stage_for_tested_models():
    data = client.get("/api/checklist").json()
    tested = [m["id"] for m in data["models"] if m["status"] == "tested"]
    assert len(data["cells"]) == len(data["stages"]) * len(tested)
    assert {c["test"] for c in data["cells"]} <= {"PASS", "PARTIAL", "FAIL", "N/T"}


def test_sample_detail_and_media():
    detail = client.get("/api/samples/handwritten_text/0001").json()
    assert detail["sample"]["ground_truth"]["text"]
    assert detail["predictions"]
    assert client.get(detail["sample"]["image_url"]).status_code == 200
    assert client.get("/api/samples/does/not/exist").status_code == 404


def test_model_detail():
    data = client.get("/api/models/pp_structurev3").json()
    assert set(data["scores"]) == {"default", "full"}
    assert data["ablations"]
    assert client.get("/api/models/nope").status_code == 404
