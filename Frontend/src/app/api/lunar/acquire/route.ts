import { NextResponse } from 'next/server';
import {
  AcquireRequest,
  BBOX_MAX_SPAN_DEG,
  buildJitManifest,
  clampLat,
  clampLon,
  DEFAULT_CONFIG,
} from '@/lib/lunar/groundSegment';

/* ==========================================================================
   POST /api/lunar/acquire — the JIT Planetary Data Streamer middleware.

   In-memory, zero-disk: validates the bounding box, resolves the engine
   (live PRADAN bridge vs deterministic JIT-SIM fail-safe), and returns a
   product manifest + a generated PDS4-style label. Nothing is persisted —
   the manifest lives only in this response and the client's RAM.

   Engine routing:
   · mock  → always the deterministic JIT-SIM engine (offline reviews).
   · live  → authenticated PRADAN bridge attempt only; reports failure
             honestly (live-unreachable) instead of fabricating data.
   · auto  → live bridge when a session cookie is configured, JIT-SIM
             fail-safe otherwise (the hackathon safety net).
   ========================================================================== */

export const runtime = 'nodejs';

const LIVE_TIMEOUT_MS = 6000;

/** Attempt a live authenticated query against the ISSDC PRADAN portal.
    Returns ok=false with the failure reason when the portal is out of
    reach (offline review halls, egress-restricted sandboxes) or the
    session is not usable — callers then engage the fail-safe engine. */
async function tryLiveBridge(req: AcquireRequest): Promise<{
  ok: boolean;
  reason: string;
  httpStatus?: number;
}> {
  const cookie = (req.jsessionid || '').trim();
  if (!cookie) return { ok: false, reason: 'No PRADAN session configured' };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LIVE_TIMEOUT_MS);
    const res = await fetch('https://pradan.issdc.gov.in/pradan/', {
      headers: { Cookie: cookie, 'User-Agent': 'LunarMatch-JIT-Bridge/1.0' },
      cache: 'no-store',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    // A logged-out session is bounced to the sign-on page — detect it.
    const head = (await res.text()).slice(0, 4000).toLowerCase();
    const bouncedToLogin = head.includes('signon') || head.includes('login');
    if (bouncedToLogin) {
      return { ok: false, reason: 'PRADAN reachable but the session cookie was rejected', httpStatus: res.status };
    }
    if (!res.ok) {
      return { ok: false, reason: `PRADAN responded ${res.status}`, httpStatus: res.status };
    }
    return { ok: false, reason: 'PRADAN session alive — authorized product streaming requires the registered archive workflow (configure it in the ISSDC console); JIT-SIM engaged for this ROI', httpStatus: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network error';
    return { ok: false, reason: `PRADAN unreachable (${msg})` };
  }
}

export async function POST(req: Request) {
  let body: Partial<AcquireRequest> & { configMode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const lat = clampLat(Number(body.lat));
  const lon = clampLon(Number(body.lon));
  let spanDeg = Number(body.spanDeg);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(spanDeg)) {
    return NextResponse.json({ error: 'lat, lon and spanDeg are required numbers' }, { status: 400 });
  }
  // Hard guardrail — the streamer refuses oversized windows.
  spanDeg = Math.min(BBOX_MAX_SPAN_DEG, Math.max(0.004, spanDeg));

  const sensor: AcquireRequest['sensor'] =
    body.sensor === 'OHRC' || body.sensor === 'DUAL' ? body.sensor : 'TMC-2';

  const configMode = (body.configMode || DEFAULT_CONFIG.mode) as 'auto' | 'mock' | 'live';
  const mode: AcquireRequest['mode'] =
    body.mode === 'live' || body.mode === 'mock' ? body.mode : configMode;

  const jsessionid = typeof body.jsessionid === 'string' ? body.jsessionid : '';
  const landmark = typeof body.landmark === 'string' ? body.landmark : undefined;

  /* LIVE / AUTO-with-session: attempt the real bridge first. */
  if (mode === 'live' || (mode === 'auto' && jsessionid.trim())) {
    const live = await tryLiveBridge({ lat, lon, spanDeg, sensor, mode, jsessionid });
    if (mode === 'live') {
      // Strict live mode reports the bridge result honestly — no fallback.
      if (!live.ok) {
        return NextResponse.json({
          status: 'live-unreachable',
          note: live.reason,
          httpStatus: live.httpStatus ?? null,
        });
      }
    } else if (!live.ok) {
      // AUTO: engage the fail-safe engine and say so.
      const manifest = buildJitManifest({ lat, lon, spanDeg, sensor, mode, jsessionid, landmark }, Date.now());
      manifest.note = `LIVE bridge: ${live.reason} — JIT-SIM fail-safe engaged.`;
      return NextResponse.json(manifest);
    }
  }

  /* JIT-SIM fail-safe engine (the default demo path). */
  const manifest = buildJitManifest({ lat, lon, spanDeg, sensor, mode, jsessionid, landmark }, Date.now());
  if (mode === 'auto' && !jsessionid.trim()) {
    manifest.note = 'No PRADAN session configured — JIT-SIM engine streaming this ROI deterministically.';
  }
  return NextResponse.json(manifest);
}
