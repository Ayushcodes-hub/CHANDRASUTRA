'use client';

/* ==========================================================================
   /backend-status — NEW PAGE, added to link this frontend to the LUNAR-X
   Python backend without touching any existing frontend code.

   Calls the backend's real /api/health endpoint (through the
   /api/backend/* proxy route added alongside this page) and shows the
   live response, so you can confirm both halves of the project are
   actually talking to each other once you've started:

     Backend:  python run.py            (LUNAR-X backend zip, port 8000)
     Frontend: npm run dev / bun dev    (this project, port 3000)
   ========================================================================== */

import { useEffect, useState } from 'react';

type HealthResponse = {
  status: string;
  version: string;
  gpu_available: boolean;
  gpu_name: string | null;
  cpu_percent: number;
  memory_percent: number;
  matchers_available: string[];
  refinements_available: string[];
  services: { name: string; status: string; detail: string }[];
};

type ProxyError = { unavailable: true; note: string };

export default function BackendStatusPage() {
  const [data, setData] = useState<HealthResponse | ProxyError | null>(null);
  const [loading, setLoading] = useState(true);

  async function check() {
    setLoading(true);
    try {
      const res = await fetch('/api/backend/api/health', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ unavailable: true, note: 'Request to the proxy route itself failed.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
  }, []);

  const isError = data && 'unavailable' in data;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>LUNAR-X Backend Link Status</h1>
      <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
        Frontend (this app, port 3000) → <code>/api/backend/*</code> proxy → Python FastAPI backend (port 8000)
      </p>

      {loading && <p>Checking connection…</p>}

      {!loading && data && !isError && (
        <div style={{ border: '1px solid #2a2', borderRadius: 8, padding: '1rem', background: '#0a1a0a' }}>
          <p style={{ color: '#4f4', fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Connected</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      {!loading && data && isError && (
        <div style={{ border: '1px solid #a22', borderRadius: 8, padding: '1rem', background: '#1a0a0a' }}>
          <p style={{ color: '#f44', fontWeight: 'bold', marginBottom: '0.5rem' }}>✗ Not connected</p>
          <p style={{ fontSize: '0.85rem' }}>{(data as ProxyError).note}</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.75rem' }}>
            Start the backend with <code>python run.py</code> from the LUNAR-X backend project, then reload this page.
          </p>
        </div>
      )}

      <button
        onClick={check}
        style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
      >
        Re-check
      </button>
    </main>
  );
}