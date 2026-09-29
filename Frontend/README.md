# LUNARMATCH 2.0 — Deep-Space Telemetry & Multi-Modal Registration Console

A space-themed mission-control console for lunar-surface registration, 3D terrain
synthesis, photometric analysis and telemetry archival — built for the
Chandrayaan-class deep-space data workflow. Dark HUD aesthetic inspired by
NASA/SpaceX flight consoles: JetBrains-style mono micro-typography, CRT scanlines,
live starfield, cyan/green/amber instrument accents.

## The five console modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **ORBITAL REGISTRATION** | CH-2 TMC-2 ⇌ OHRC orbit-pass registration board — pass table, registration quality metrics (RMSE / PSNR / SSIM), A/B pass comparator with archive percentiles, ground-track sky radar |
| 2 | **3D DEM SYNTHESIS** | WebGL digital elevation model synthesis from matched imagery — relief/hillshade/wireframe modes, DEM frame capture (PNG export with HUD burn-in) |
| 3 | **PHOTOMETRIC LAB** | Lommel–Seeliger / Lommel–Hapke photometric correction playground, IIRS spectral band viewer |
| 4 | **ELEVATION PROFILES** | Cross-crater elevation transects with A→B rover path simulation (live telemetry sparkline, abort gating, map overlay) |
| 5 | **TELEMETRY ARCHIVE** | Full pass/incident archive with PDS-4 export, incident timeline, VLM intel feed |

## Console systems

⌘K command palette · mission replay tape (scrubbable, persisted) · alert-flare
engine with triage drawer (persisted) · DSN handover simulation · downlink QoS
queue · HGA az/el sun dial · mission phase timeline · dwell odometer · hotkey
legend (`?`) · shareable console state (URL hash) · boot sequence.

## Quick start

Prereqs: **Node 20+** (or Bun 1.1+), and one package manager.

```bash
# 1 — install dependencies
bun install            # or: npm install

# 2 — point Prisma at the bundled SQLite db
#      (.env is included; adjust if you move the db/ folder)
#      DATABASE_URL=file:../db/custom.db

# 3 — sync the Prisma schema (bundled db/ already matches; safe to re-run)
bun run db:push        # or: npx prisma db push

# 4 — run the dev server
bun run dev            # or: npm run dev
```

Open **http://localhost:3000**.

### Production build

```bash
bun run build
bun run start          # serves the standalone build on :3000
```

## Keyboard controls

| Key | Action |
|-----|--------|
| `1`–`5` | Switch console module |
| `⌘K` / `Ctrl+K` | Command palette (module jumps, drill anomaly, share link, exports) |
| `F1` | Toggle DEM wireframe |
| `F2` | Invert solar azimuth (HGA dial + photometric geometry) |
| `F6` | Mission replay tape |
| `A` | Alert history triage drawer |
| `?` | Hotkey legend |
| `Esc` | Reset camera / close overlays |
| `←`/`→` | Nudge replay tape cursor (when open) |

## Project structure

```
src/
  app/                    Next.js App Router shell + API routes
    api/lunar/…           acquisition / scan / session endpoints
    api/mission/…         passes, VLM intel, PDS-4 + CSV exports
  components/
    dashboard/            console chrome (TopBar, PhaseRail, sidebar, status bar,
                          replay tape, alert engine, command palette …)
    views/                the five console modules
    hud/                  shared HUD primitives, charts, starfield
  lib/
    lunar/                simulation engine, ground segment, VLM archive, types
    mission-store.ts      zustand mission state (telemetry tick, journal, alerts)
prisma/                   SQLite schema + seed
db/custom.db              pre-seeded mission database (passes + incidents)
public/imagery/           crater imagery plates used by the modules
```

## API surface

| Route | Purpose |
|-------|---------|
| `GET /api/mission/passes` | Registered orbit passes (paginated) |
| `GET /api/mission/vlm-intel?module=<id>` | Module-scoped VLM intel feed |
| `GET /api/mission/export/passes` | CSV export of the pass register |
| `GET /api/mission/export/pds4` | PDS-4 XML bundle export |
| `POST /api/lunar/acquire` · `/scan` · `/session` | Imagery acquisition / sweep / session lifecycle |

## Notes

- All state is client-simulated (1 Hz telemetry tick); no external services required.
- Alert journal + replay tape persist to `localStorage` and survive reloads.
- Reduced-motion is respected globally (HUD sweeps disabled under `prefers-reduced-motion`).
- Designed for 1440×900 desktop; fully responsive down to 390 px.
