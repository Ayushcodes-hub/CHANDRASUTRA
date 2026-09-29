import { NextResponse } from 'next/server';

/* ==========================================================================
   /api/backend/[...path] — LUNAR-X backend bridge.

   NEW FILE — added to link this frontend to the separately-run LUNAR-X
   Python/FastAPI backend without touching any existing frontend code.

   Forwards any request under /api/backend/* to the FastAPI server (default
   http://localhost:8000), preserving method, query string, headers and
   body, then streams the response straight back to the browser.

   Example:
     GET  /api/backend/api/health         -> GET  http://localhost:8000/api/health
     POST /api/backend/api/v1/jobs        -> POST http://localhost:8000/api/v1/jobs
     GET  /api/backend/api/v1/images/samples -> GET http://localhost:8000/api/v1/images/samples

   Configure the target with BACKEND_API_URL (see .env.local). Defaults to
   http://localhost:8000, which is exactly where `python run.py` in the
   LUNAR-X backend zip listens by default.
   ========================================================================== */

export const runtime = 'nodejs';

const DEFAULT_BACKEND_URL = 'http://localhost:8000';
const PROXY_TIMEOUT_MS = 30000;

function backendBaseUrl(): string {
  return (process.env.BACKEND_API_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
}

async function proxy(req: Request, path: string[]): Promise<Response> {
  const incoming = new URL(req.url);
  const targetUrl = `${backendBaseUrl()}/${path.join('/')}${incoming.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('connection');

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROXY_TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, { ...init, signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);

    const resHeaders = new Headers(res.headers);
    resHeaders.delete('content-encoding');
    resHeaders.delete('content-length');

    const body = await res.arrayBuffer();
    return new Response(body, { status: res.status, headers: resHeaders });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : 'network error';
    return NextResponse.json(
      {
        unavailable: true,
        note: `LUNAR-X backend unreachable at ${backendBaseUrl()} (${msg}). Make sure "python run.py" is running in the backend project.`,
      },
      { status: 502 },
    );
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
