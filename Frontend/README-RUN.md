# LunarMatch Frontend — Quickstart

This is the unmodified LunarMatch (Next.js) app, plus two **new** files that
link it to the separate LUNAR-X Python backend zip:

- `src/app/api/backend/[...path]/route.ts` — proxies requests to the backend
- `src/app/backend-status/page.tsx` — a page to verify the two are connected
- `.env.local` — sets `BACKEND_API_URL` (new file, doesn't touch the existing `.env`)

No existing file from the original project was modified.

## 1. Install dependencies

```bash
npm install        # or: bun install
```

## 2. Set up the local database (unchanged from the original project)

```bash
npm run db:push
```

## 3. Run the dev server

```bash
npm run dev
```

Opens at **http://localhost:3000**.

## 4. Run it together with the backend

1. Start the **LUNAR-X backend** zip first: `python run.py` (listens on port 8000).
2. Start this frontend: `npm run dev` (port 3000).
3. Visit **http://localhost:3000/backend-status** — it calls the backend's
   `/api/health` endpoint live (through the new `/api/backend/*` proxy) and
   shows the real JSON response if the link is working.

Everything else in the app (the mission dashboard, JIT-SIM data streamer,
etc.) works exactly as it did before — those are unchanged. The new proxy
route is simply available at `/api/backend/*` for any part of the app (or
you) to call into the real Python registration engine, e.g.:

- `GET  /api/backend/api/health`
- `GET  /api/backend/api/v1/images/samples`
- `POST /api/backend/api/v1/images/synthetic`
- `POST /api/backend/api/v1/jobs`
- `GET  /api/backend/api/v1/jobs/{job_id}/result`

If the backend isn't running, these calls return a clear
`{"unavailable": true, "note": "..."}` response instead of failing silently.
