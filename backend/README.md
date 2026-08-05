# Fleet Tracker backend

FastAPI backend that becomes the single writer to the Fleet Tracker Supabase
Postgres DB. See `REBUILD_PLAN.md` in the project root for the full plan;
this covers Phase A step 3 (foundation) only.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# fill in DB_A_URL with the real Supabase connection string
```

## Run

```bash
uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Swagger UI: http://localhost:8000/docs

## Structure

```
app/
  main.py        FastAPI app, CORS, router registration, /health
  config.py      env settings (DB URLs, JWKS URL, allowed origins)
  db.py          asyncpg connection pools (DB A live, DB B scaffolded)
  auth.py        JWT validation — added in step 4
  computed.py    ported view-model logic — added in step 5
  services/      business logic per domain (equipment, moves, ...)
  routers/       one router per resource
tests/
```
