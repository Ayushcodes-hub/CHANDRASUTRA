import { NextResponse } from 'next/server';

/* ==========================================================================
   POST /api/lunar/session — PRADAN session bridge verifier.

   The operator pastes their ISSDC JSESSIONID (or credentials-derived
   cookie) into the cockpit's settings gear; this endpoint pings the
   portal with the cookie under a tight timeout and reports whether the
   session looks alive. No cookie value is ever logged or persisted
   server-side — it travels through RAM only.
   ========================================================================== */

export const runtime = 'nodejs';

const VERIFY_TIMEOUT_MS = 6000;

export async function POST(req: Request) {
  let body: { jsessionid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const cookie = (body.jsessionid || '').trim();
  if (!cookie) {
    return NextResponse.json({ reachable: false, authOk: false, note: 'No session cookie provided' });
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT_MS);
    const res = await fetch('https://pradan.issdc.gov.in/pradan/', {
      headers: { Cookie: cookie, 'User-Agent': 'LunarMatch-JIT-Bridge/1.0' },
      cache: 'no-store',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const head = (await res.text()).slice(0, 4000).toLowerCase();
    const bouncedToLogin = head.includes('signon') || head.includes('login');
    return NextResponse.json({
      reachable: true,
      httpStatus: res.status,
      authOk: res.ok && !bouncedToLogin,
      note: bouncedToLogin
        ? 'Portal reachable, but the cookie was bounced to sign-on — paste a fresh JSESSIONID from an authenticated tab.'
        : 'Portal reachable and the session cookie was accepted for the landing context.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network error';
    return NextResponse.json({
      reachable: false,
      authOk: false,
      note: `ISSDC portal unreachable from this environment (${msg}). The JIT-SIM fail-safe engine keeps acquisitions running.`,
    });
  }
}
