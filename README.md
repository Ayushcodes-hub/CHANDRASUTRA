# CHANDRASŪTRA

### LUNARIS 2.0 — Multi-Modal Lunar Image Registration & Mission Analysis Platform

> **A research-oriented lunar image registration and mission-analysis system for Chandrayaan-class planetary imaging workflows.**

**CHANDRASŪTRA** is the integrated platform behind **LUNARIS 2.0**, combining a scientific Python/FastAPI registration engine with an immersive Next.js mission-control interface.

The system is designed around a central problem in planetary remote sensing:

**How can observations of the same lunar terrain, acquired under different imaging conditions, sensors, illumination angles, scales, and orbital passes be registered with high geometric accuracy and then turned into useful terrain, photometric, elevation, and mission intelligence?**

LUNARIS approaches this as a complete processing and visualization pipeline rather than a single image-matching algorithm.

---

## ✦ What is LUNARIS?

LUNARIS is a **multi-modal lunar image registration and analysis platform** developed for the **ISRO Smart India Hackathon problem statement #26166 — Multi-modal, Sun-angle and Scale Invariant Lunar Image Registration**.

The platform combines:

* Classical computer vision
* Deep feature matching
* Transformer-based correspondence estimation
* Cross-modal image matching
* Sub-pixel registration refinement
* Photometric correction
* Digital elevation analysis
* Mission telemetry visualization
* Model evaluation and benchmarking
* Scientific data export

The result is a unified environment where an operator can move from **image registration → geometric refinement → terrain analysis → mission interpretation**.

---

# 🚀 Core Capabilities

## 1. Multi-Modal Lunar Image Registration

LUNARIS provides multiple registration strategies rather than relying on a single matcher.

### Available matching engines

| Matcher       | Role                                     |
| ------------- | ---------------------------------------- |
| **RoMa**      | Primary dense / robust deep matcher      |
| **LightGlue** | Fast lightweight deep matching           |
| **LoFTR**     | Transformer-based detector-free matching |
| **SIFT**      | Classical computer-vision baseline       |

The backend maintains a matcher registry so different algorithms can be selected and evaluated within the same processing architecture.

The model card documents the implemented matching and model pipeline, including DINOv2-backed feature extraction, LoFTR, LightGlue and SIFT baselines.

---

## 2. Sub-Pixel Refinement

Initial correspondences are refined through multiple geometric refinement strategies:

* Phase correlation
* ECC refinement
* Pyramid refinement
* Learned refinement

This allows the system to move beyond simply finding matching points and toward **precise geometric alignment**.

The registration pipeline exposes quantitative outputs such as:

* RMSE
* PSNR
* SSIM
* Inlier count
* Inlier ratio
* Match confidence
* Registration status

---

## 3. Deep Learning + Classical Vision

LUNARIS deliberately combines modern deep-learning approaches with classical computer vision.

### Deep / learned methods

* DINOv2
* RoMa-style dense matching
* LoFTR
* LightGlue
* Learned refinement

### Classical methods

* SIFT
* ORB-based fallback matching
* BF matching
* Phase correlation
* ECC

This makes the platform useful not only for producing a registration result, but also for **comparing different registration strategies and establishing classical baselines**.

---

# 🛰️ Mission Console

The frontend presents the processing system as a deep-space mission console rather than a conventional dashboard.

The interface contains **five major scientific/mission modules**.

### 01 — ORBITAL REGISTRATION

A registration command center for comparing lunar observations and orbit passes.

Includes:

* Registration quality metrics
* RMSE / PSNR / SSIM
* Inlier statistics
* A/B pass comparison
* Pass archive information
* Ground-track visualization
* Sky-radar style orbital visualization

---

### 02 — 3D DEM SYNTHESIS

Transforms registered imagery into terrain-oriented visualization workflows.

Includes:

* Digital elevation visualization
* Relief rendering
* Hillshade
* Wireframe mode
* DEM frame capture
* Terrain-oriented 3D visualization

---

### 03 — PHOTOMETRIC LAB

Provides an environment for investigating illumination-dependent lunar imagery.

Includes:

* Lommel–Seeliger correction
* Lommel–Hapke style photometric workflows
* Solar geometry
* IIRS spectral-band visualization
* Illumination analysis

---

### 04 — ELEVATION PROFILES

Provides cross-terrain elevation analysis and rover-style traversal simulation.

Includes:

* Cross-crater elevation profiles
* A→B terrain traversal
* Rover simulation
* Live telemetry visualization
* Map overlays
* Mission/abort gating

---

### 05 — TELEMETRY ARCHIVE

A mission-oriented archive for registration passes and operational events.

Includes:

* Pass archive
* Incident timeline
* Mission replay
* VLM intelligence feed
* PDS-4 export
* CSV export
* Downlink/DSN-oriented visualization

---

# 🧠 System Architecture

```text
                         ┌───────────────────────────┐
                         │       CHANDRASŪTRA        │
                         │       LUNARIS 2.0         │
                         └─────────────┬─────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
             ┌──────▼──────┐                      ┌──────▼──────┐
             │   FRONTEND   │                      │   BACKEND   │
             │   Next.js    │                      │   FastAPI   │
             │ TypeScript   │                      │   Python    │
             └──────┬──────┘                      └──────┬──────┘
                    │                                     │
        ┌───────────┼───────────────┐        ┌────────────┼─────────────┐
        │           │               │        │            │             │
   Mission UI    3D/HUD       Mission State  │      Registration     MLOps
        │           │               │        │            │             │
        │           │               │        │            │             │
        ▼           ▼               ▼        ▼            ▼             ▼
   Orbital       DEM          Telemetry   Matching    Refinement    Evaluation
 Registration   Synthesis      Archive       │            │             │
                                              │            │             │
                              ┌───────────────┼────────────┴─────────────┐
                              │               │                          │
                             RoMa          LoFTR                    LightGlue
                              │               │                          │
                              └───────────────┼──────────────────────────┘
                                              │
                                             SIFT
                                              │
                                              ▼
                                  Registration Metrics
                                              │
                                              ▼
                                  Scientific / Mission Output
```

---

# 🧩 Repository Structure

```text
CHANDRASŪTRA/
│
├── Backend/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── core/
│   │   │   ├── evaluation/
│   │   │   ├── geometry/
│   │   │   ├── ingestion/
│   │   │   ├── matching/
│   │   │   ├── mlops/
│   │   │   ├── pipelines/
│   │   │   ├── preprocessing/
│   │   │   └── refinement/
│   │   │
│   │   ├── ml/
│   │   │   └── models/
│   │   ├── scripts/
│   │   └── tests/
│   │
│   ├── configs/
│   ├── ml/
│   ├── test_data/
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── run.py
│   └── check_setup.py
│
└── Frontend/
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   └── backend-status/
    │   ├── components/
    │   │   ├── dashboard/
    │   │   ├── hud/
    │   │   ├── ui/
    │   │   └── views/
    │   ├── hooks/
    │   └── lib/
    │       └── lunar/
    │
    ├── prisma/
    ├── public/
    │   ├── imagery/
    │   └── logo.svg
    ├── package.json
    ├── bun.lock
    └── tsconfig.json
```

---

# ⚙️ Technology Stack

## Backend

* **Python 3.11+**
* **FastAPI**
* **Uvicorn**
* **Pydantic**
* **SQLAlchemy**
* **SQLite / aiosqlite**
* **NumPy**
* **SciPy**
* **OpenCV**
* **scikit-image**
* **PyTorch**
* **TorchVision**
* **Kornia**
* **Pillow**
* **Matplotlib**
* **PyYAML**

The backend is configured with Black, Ruff, MyPy and Pytest tooling.

## Frontend

* **Next.js**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **Framer Motion**
* **Three.js**
* **Zustand**
* **Prisma**
* **SQLite**
* **Recharts**
* **Radix UI**
* **Lucide**
* **React Query**

---

# 🛠️ Quick Start

## 1. Clone

```bash
git clone https://github.com/Ayushcodes-hub/Lunaris-2.git
cd Lunaris-2
```

---

# 🐍 Backend

Open a terminal:

```bash
cd Backend
```

Create a virtual environment:

### Windows

```cmd
python -m venv .venv
.venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Optional geospatial support:

```bash
pip install rasterio
```

Run the environment check:

```bash
python check_setup.py
```

Start the backend:

```bash
python run.py
```

The API runs on:

```text
http://localhost:8000
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

Health endpoint:

```text
http://localhost:8000/api/health
```

---

# 🌐 Frontend

Open another terminal:

```bash
cd Frontend
```

Install dependencies:

```bash
bun install
```

or:

```bash
npm install
```

Synchronize the Prisma database:

```bash
bun run db:push
```

or:

```bash
npx prisma db push
```

Start the development server:

```bash
bun run dev
```

or:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🔗 Running Frontend + Backend Together

Start the backend first:

```text
Backend → http://localhost:8000
```

Then start the frontend:

```text
Frontend → http://localhost:3000
```

The frontend contains a backend proxy:

```text
/api/backend/*
```

and a dedicated connection diagnostic page:

```text
http://localhost:3000/backend-status
```

The frontend can therefore communicate with the real Python registration engine without exposing the backend directly to browser-side code.

---

# 🔌 Backend API Surface

The FastAPI backend currently exposes several API groups.

### Health

```text
GET /api/health
```

### Images

```text
GET  /api/v1/images/...
POST /api/v1/images/...
```

### Registration Jobs

```text
POST /api/v1/jobs
GET  /api/v1/jobs/{job_id}/result
```

### Integrations

```text
/api/v1/integrations/...
```

### MLOps

```text
/api/mlops/...
```

Interactive documentation is automatically generated by FastAPI at:

```text
http://localhost:8000/docs
```

---

# 🎮 Console Controls

| Key        | Function                      |
| ---------- | ----------------------------- |
| `1`        | Orbital Registration          |
| `2`        | DEM Synthesis                 |
| `3`        | Photometric Lab               |
| `4`        | Elevation Profiles            |
| `5`        | Telemetry Archive             |
| `Ctrl + K` | Command Palette               |
| `F1`       | Toggle DEM wireframe          |
| `F2`       | Invert solar azimuth          |
| `F6`       | Mission replay                |
| `A`        | Alert history                 |
| `?`        | Hotkey legend                 |
| `Esc`      | Reset camera / close overlays |
| `← / →`    | Replay cursor navigation      |

---

# 📐 Registration Pipeline

At a high level, a registration request follows this flow:

```text
Input Imagery
     │
     ▼
Ingestion
     │
     ▼
Preprocessing
     │
     ▼
Feature / Correspondence Extraction
     │
     ├───────────────┬───────────────┬───────────────┐
     ▼               ▼               ▼               ▼
    RoMa           LoFTR        LightGlue          SIFT
     │               │               │               │
     └───────────────┴───────────────┴───────────────┘
                             │
                             ▼
                    Match Validation
                             │
                             ▼
                    Geometric Estimation
                             │
                             ▼
                     Sub-Pixel Refinement
                             │
                             ▼
                       Evaluation
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
             RMSE           PSNR           SSIM
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    Registration Result
```

---

# 🧪 Evaluation & Reproducibility

LUNARIS includes a dedicated evaluation and testing structure rather than treating the UI as the source of truth.

The backend contains tests covering areas including:

* Backbone functionality
* Cross-modal matching
* Deep matchers
* Metrics
* Photometric processing
* Preprocessing
* Refinement
* SIFT pipelines
* Synthetic registration
* Training loops

The model registry records model/checkpoint information, while the model card documents the matching architectures and their provenance.

The project is designed so that registration metrics displayed by the pipeline originate from actual computation rather than fabricated UI values.

---

# 🧠 Model & Matcher Philosophy

LUNARIS uses a layered matcher strategy:

```text
                 ┌────────────────────┐
                 │       RoMa         │
                 │   Flagship / Dense │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │     LightGlue      │
                 │ Fast / Lightweight │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │       LoFTR        │
                 │ Transformer-based  │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │        SIFT        │
                 │ Classical Baseline │
                 └────────────────────┘
```

SIFT is retained specifically as a classical comparison baseline rather than being treated as the primary deep matcher.

When supported LightGlue functionality is unavailable, the backend contains a lightweight fallback path based on ORB/BF matching.

---

# 🔬 Scientific Modules

Beyond registration, CHANDRASŪTRA provides a broader analysis environment:

### Image Registration

Correspondence estimation, geometric alignment and sub-pixel refinement.

### Photometry

Illumination-aware analysis using lunar photometric models.

### Terrain

DEM-oriented visualization and elevation profiling.

### Mission Operations

Telemetry, pass archives, incidents, replay and operator-oriented mission state.

### Data Products

CSV and PDS-4-oriented export workflows.

---

# 💾 Data & Persistence

The frontend uses Prisma with SQLite for local mission persistence.

The schema includes entities for:

* Orbit passes
* Operational incidents
* Pipeline benchmark runs
* VLM intelligence reports

The frontend also maintains mission-console state such as:

* Alerts
* Replay history
* Selected modules
* Telemetry state
* Operator navigation

The application can preserve selected console state through URL hashes, allowing a configured console state to be shared.

---

# 🔐 Configuration & Secrets

Environment-specific configuration should remain local.

Do **not** commit:

```text
.env
.env.local
private credentials
API keys
local secrets
```

Use the provided environment examples where applicable and configure local services independently.

---

# 📊 Design Principles

CHANDRASŪTRA is built around several principles:

### 01 — Real computation

Displayed scientific metrics should originate from the processing pipeline.

### 02 — Algorithmic plurality

No single matching algorithm should be treated as universally sufficient.

### 03 — Classical baselines matter

Modern deep-learning approaches should remain comparable against established computer-vision methods.

### 04 — Scientific traceability

Models, checkpoints, processing stages and evaluation outputs should remain identifiable.

### 05 — Operator-centric visualization

Scientific processing should be understandable through an interface designed around mission workflows.

### 06 — Modular architecture

Matching, refinement, preprocessing, evaluation, MLOps and visualization remain separable components.

---

# 🛰️ Project Context

**Problem Statement:**
ISRO Smart India Hackathon **#26166**

**Domain:**
Lunar / Planetary Remote Sensing · Computer Vision · AI/ML · Image Registration · Geospatial Analysis

**Primary Objective:**
Multi-modal, sun-angle and scale-invariant lunar image registration.

**Platform:**
CHANDRASŪTRA / LUNARIS 2.0

---

# 📚 Research Foundations

The system incorporates ideas and models originating from established computer-vision research, including:

* **DINOv2** — self-supervised visual features
* **RoMa** — robust dense feature matching
* **LoFTR** — detector-free local feature matching with transformers
* **LightGlue** — adaptive feature matching
* **SIFT** — scale-invariant classical feature matching

The repository's model card documents the specific model sources, licenses, checkpoints and roles used by LUNARIS.

---

# ⚠️ Research & Engineering Status

CHANDRASŪTRA is a research/engineering platform and should not be interpreted as an official ISRO software product.

Performance depends on:

* Input imagery
* Sensor characteristics
* Illumination geometry
* Image scale
* Image quality
* Matcher selection
* Hardware
* Available model weights
* Processing configuration

Benchmark values should therefore be interpreted in the context of their corresponding datasets and experimental conditions.

---

# 🗺️ Roadmap

Potential future development areas include:

* [ ] Expanded Chandrayaan imagery ingestion
* [ ] More cross-sensor registration experiments
* [ ] GPU-optimized dense matching
* [ ] Larger benchmark datasets
* [ ] Improved uncertainty estimation
* [ ] Advanced lunar DEM generation
* [ ] Automated registration-quality ranking
* [ ] Extended PDS-4 product generation
* [ ] Reproducible experiment bundles
* [ ] Expanded scientific visualization
* [ ] Hardware-accelerated inference
* [ ] More comprehensive end-to-end validation

---

# 👥 Project

**CHANDRASŪTRA / LUNARIS 2.0**

Built as a unified exploration of:

**Computer Vision × Deep Learning × Lunar Remote Sensing × Geometric Registration × Mission Systems**

---

## ⭐ If you are exploring the repository

A good starting path is:

```text
Frontend/src/app/page.tsx
        ↓
Frontend/src/components/views/
        ↓
Backend/backend/app/main.py
        ↓
Backend/backend/app/matching/
        ↓
Backend/backend/app/refinement/
        ↓
Backend/backend/app/pipelines/
        ↓
Backend/backend/app/evaluation/
```

For model provenance and matcher details:

```text
Backend/MODEL_CARD.md
```

For backend setup:

```text
Backend/README-RUN.md
```

For frontend setup:

```text
Frontend/README-RUN.md
```

---

### CHANDRASŪTRA

**From lunar imagery to registered terrain intelligence.**

**Observe. Register. Refine. Analyze.**
