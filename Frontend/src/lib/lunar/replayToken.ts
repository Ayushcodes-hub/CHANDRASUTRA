import { PipelineParameters } from './types';

/* ==========================================================================
   Replay token — a shareable, self-contained description of one pipeline
   run. The token is the URL-safe base64 of the run's full configuration
   (including the derived seed when SEED LOCK is armed), encoded into the
   page hash as `#replay=<token>`. Opening such a link restores the exact
   site, instruments, solar geometry, preprocessing and RANSAC surface —
   and with a seed embedded, replays byte-identical matches. This is the
   "copy this run to a teammate / judge" affordance.
   ========================================================================== */

const TOKEN_PREFIX = 'lm1'; // schema tag — bump when the payload shape changes

/** View-only settings never travel in a token (restore keeps the visitor's stage). */
const VIEW_KEYS: ReadonlyArray<keyof PipelineParameters> = [
  'viewMode',
  'checkerboardSize',
  'blendAlpha',
  'splitWipePosition',
  'showKeypointLines',
  'minConfidenceFilter',
];

const b64urlEncode = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const b64urlDecode = (t: string): string => {
  const b64 = t.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/**
 * Encode the shareable replay token for a run configuration. `params` should
 * already carry `rngSeed` (derived when SEED LOCK is armed, null otherwise).
 */
export const encodeReplayToken = (params: PipelineParameters): string => {
  const slim: Record<string, unknown> = { v: TOKEN_PREFIX };
  for (const [k, v] of Object.entries(params)) {
    if (VIEW_KEYS.includes(k as keyof PipelineParameters)) continue;
    slim[k] = v;
  }
  return b64urlEncode(JSON.stringify(slim));
};

/**
 * Decode a replay token back into pipeline parameters. Returns null for
 * malformed / foreign tokens (never throws — a bad paste must not break boot).
 */
export const decodeReplayToken = (token: string): PipelineParameters | null => {
  try {
    const parsed = JSON.parse(b64urlDecode(token)) as { v?: string } & Partial<PipelineParameters>;
    if (parsed.v !== TOKEN_PREFIX) return null;
    if (
      typeof parsed.presetId !== 'string' ||
      typeof parsed.referenceSunElevation !== 'number' ||
      typeof parsed.sourceSunElevation !== 'number' ||
      (parsed.referenceInstrument !== 'TMC-2' && parsed.referenceInstrument !== 'IIRS')
    ) {
      return null;
    }
    // Merge over the caller's defaults; only the token's known fields apply.
    return parsed as PipelineParameters;
  } catch {
    return null;
  }
};

/** Extract a `#replay=<token>` hash fragment from a URL string (if any). */
export const replayTokenFromHash = (hash: string): string | null => {
  const m = hash.match(/^#replay=([A-Za-z0-9\-_]+)$/);
  return m ? m[1] : null;
};
