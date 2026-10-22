# Niera OCR benchmark dashboard

Next.js + shadcn/ui frontend for the benchmark results. All data comes from the FastAPI backend in `../api`.

## Run locally

```bash
# 1. API (fills a local SQLite file with demo data on first start)
cd ../api && uv run uvicorn app.main:app --port 8000 --reload

# 2. Frontend
cd ../dashboard && cp .env.example .env.local && npm install && npm run dev
```

Open http://localhost:3000.

## Pages

| Path | Shows |
|---|---|
| `/` | Leaderboard. Rank = average of the three focus areas (handwriting, handwritten formulas, diagram labels) |
| `/models?id=…` | One model: default vs all-stages scores, time per sample, pipeline with on/off effect of each optional stage |
| `/checklist` | STAGES.md grid: test result per model and stage, plus whether the docs claim it |
| `/samples`, `/samples?id=…` | Inputs, and every model's output marked against the ground truth |
| `/runs` | Provenance of each run |

Run, config and filters live in the URL, so any view can be shared as a link.

## Types

`src/lib/api-types.ts` is generated from the API's OpenAPI schema. After changing `../api/app/schemas.py`:

```bash
npm run gen:api
```

## Builds

- `npm run build`: standard Next.js build (any Next.js host, for example Vercel).
- `STATIC_EXPORT=1 npm run build`: plain HTML/JS in `out/` for static hosts (for example Cloudflare Pages).

Set `NEXT_PUBLIC_API_URL` to the API's address at build time. Leave it empty when the API is served from the same domain under `/api`.

## Design

Answer-sheet palette: cool white paper, ballpoint-ink blue as the only accent, red pen only for failures and corrections. Ranks and stage IDs sit in a notebook margin left of a red rule. Font: Atkinson Hyperlegible, chosen because it keeps look-alike characters (l / I / 1, O / 0) distinct. Tokens are in `src/app/globals.css`.
