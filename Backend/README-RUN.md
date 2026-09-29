# LUNAR-X Backend — Quickstart

This is the Python/FastAPI backend (LUNARIS registration engine) from LUNAR-X-main,
repackaged to run standalone and be talked to by the **LunarMatch** frontend
(separate zip).

## 1. Install Python dependencies

Requires **Python 3.11+**.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

(Optional, for GeoTIFF/DEM export support: `pip install rasterio`)

## 2. Check your environment (optional but recommended)

```bash
python check_setup.py
```

## 3. Run the server

```bash
python run.py
```

This starts the API at **http://localhost:8000**.

- Interactive API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

You can also run it the original way if you prefer:

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 4. Run it together with the frontend

1. Start this backend first (`python run.py`, port 8000).
2. Start the **lunarmatch** frontend zip separately (`npm run dev`, port 3000).
3. The frontend already has CORS + a proxy pre-wired to reach this backend
   at `http://localhost:8000` (see `.env` → `CORS_ORIGINS`, which already
   includes `http://localhost:3000`).
4. Open the frontend at http://localhost:3000, then visit
   **http://localhost:3000/backend-status** to confirm the two are
   connected — it calls this backend's `/api/health` endpoint live through
   the frontend's `/api/backend/*` proxy route and shows the real response.

## What's in this bundle

- `backend/app/` — FastAPI application (health, images, jobs, mlops, integrations routers)
- `backend/app/matching/` — SIFT / LoFTR / LightGlue / RoMa matchers
- `backend/app/refinement/` — sub-pixel refinement (phase correlation, ECC, pyramid, learned)
- `backend/app/pipelines/` — orchestration of the full registration pipeline
- `backend/app/mlops/` — model registry + fine-tuning engine
- `backend/scripts/` — synthetic lunar pair generator, benchmarking
- `backend/tests/` — pytest suite (`pytest` from inside `backend/`)
- `backend/ml/models/` — pretrained checkpoint files + registry
- `ml/`, `configs/`, `test_data/` — supporting configs and sample data from the original repo
- `run.py`, `check_setup.py` — new convenience entry points added for this bundle
- `requirements.txt` — pip-installable dependency list (mirrors `pyproject.toml`)

Note: the original repo's own bundled React/Vite `frontend/` folder was
intentionally **not** included in this zip — use the separate LunarMatch
frontend zip instead.
