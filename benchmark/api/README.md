# Niera OCR benchmark API

Read-only FastAPI service behind the dashboard. Python 3.12, managed with `uv`.

```bash
uv run uvicorn app.main:app --port 8000 --reload   # http://localhost:8000/docs
uv run pytest
```

## Database

| `DATABASE_URL` | Result |
|---|---|
| unset | Local SQLite file in the system temp folder, filled with **demo data** on first start |
| `postgresql://…` (Neon) | Production. Tables are created by the publish step. Set `SEED_DEMO=1` to also load the demo run |

After editing `app/data/models.json`, update the database's copy with `uv run --env-file .env python -m app.seed --refresh` (results are not touched).

`CORS_ORIGINS` (comma-separated) lists the frontend origins allowed to call the API. Default: `http://localhost:3000`.

## Layout

| Path | What |
|---|---|
| `app/tables.py` | Database tables: models, stages, runs, samples, predictions, model loads, checklist, ablations |
| `app/schemas.py` | API response shapes (the frontend's TypeScript types are generated from these) |
| `app/main.py` | Endpoints under `/api` |
| `app/categories.py` | Leaderboard categories and which three are Niera's focus areas |
| `app/metrics.py` | CER, LaTeX exact match, label recall (demo scoring) |
| `app/seed.py` | Demo run. **Made-up numbers**, stored with `is_demo = true` |
| `app/data/stages.json` | Generated from `STAGES.md` by `scripts/export_stages.py` |
| `app/data/models.json` | Model catalogue (only verified facts; unknowns left empty) |
| `scripts/make_demo_images.py` | Draws the demo input images (text written for the demo, nothing copied) |

## Still to build

`publish.py`: reads a finished run from `benchmark/results/<run_id>/` (PIPELINE.md §4.3) and writes it to Postgres. It is written once the harness produces its first run, so it matches real output.
