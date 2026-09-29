// Runs the expensive lunar photometric rendering + LoFTR matching pipeline
// on a background thread. Doing this work on the main thread was the
// remaining source of lag/"image takes a while to load": even with the
// slider-drag spam debounced (see InteractiveWorkbench.tsx), the single
// resulting run still had to render two 512x512 photometric maps, run
// sun-angle compensation, and run the matching pipeline synchronously —
// which briefly freezes the page (including the slider itself) while it
// runs. Moving it here means the main thread — and therefore the
// slider/cursor — never blocks, no matter how heavy the computation is.

import { LunarSurfaceSimulator } from './lunarSimulation';
import { runMatchingPipeline, beginSeededRun } from './lunarSimulation';
import { PipelineParameters } from './types';

type TerrainType = 'crater' | 'ridge' | 'mare' | 'polar';

interface WorkerRequest {
  runId: number;
  terrainType: TerrainType;
  params: PipelineParameters;
  /** Just-in-time acquired site — when present, the terrain synthesizer is
      seeded from the ROI (deterministic per coordinate) instead of the
      default survey seed, so every point on the Moon is addressable. */
  roiSeed?: number;
}

// Cache the simulator per terrain type + ROI seed inside the worker too, for
// the same reason it's cached on the main thread: terrain generation is
// deterministic for a given (size, seed, terrainType), so unrelated
// parameter tweaks shouldn't pay to regenerate the DEM. JIT sites get their
// own cache slot keyed by the coordinate-derived seed.
let cached: { key: string; sim: LunarSurfaceSimulator } | null = null;

// The project's tsconfig doesn't include the "webworker" lib (it's shared
// with the main-thread code), so `self`/`postMessage` are typed loosely
// here rather than as DOM's Window shape — the runtime behavior inside an
// actual worker is correct regardless.
const ctx: any = self;

ctx.onmessage = (e: { data: WorkerRequest }) => {
  const { runId, terrainType, params, roiSeed } = e.data;
  const W = 512;
  const H = 512;

  // Arm the run-scoped RNG: a seed (SEED LOCK) makes both the IIRS sensor
  // noise and the LoFTR match sampling replayable; null keeps the live RNG.
  beginSeededRun(params.rngSeed);

  const cacheKey = `${terrainType}:${roiSeed ?? 'base'}`;
  const sim =
    cached && cached.key === cacheKey
      ? cached.sim
      : new LunarSurfaceSimulator(W, H, roiSeed ?? 101, terrainType);
  cached = { key: cacheKey, sim };

  let refImg = sim.renderPhotometricMap(
    params.referenceSunElevation,
    params.referenceSunAzimuth,
    params.referenceInstrument,
    {
      enableClahe: params.enableClahe,
      invertSpectral: params.referenceInstrument === 'IIRS' && params.invertIIRSSpectralResponse,
    }
  );

  let srcImg = sim.renderPhotometricMap(
    params.sourceSunElevation,
    params.sourceSunAzimuth,
    params.sourceInstrument,
    {
      enableClahe: params.enableClahe,
    }
  );

  if (params.enableSunAngleCompensation) {
    refImg = sim.compensateSunAngle(
      refImg,
      params.referenceSunElevation,
      params.referenceSunAzimuth,
      params.sunCompensationMethod || 'dem_lommel_seeliger'
    );
    srcImg = sim.compensateSunAngle(
      srcImg,
      params.sourceSunElevation,
      params.sourceSunAzimuth,
      params.sunCompensationMethod || 'dem_lommel_seeliger'
    );
  }

  const result = runMatchingPipeline(refImg, srcImg, W, H, params);

  // Copy the DEM out (the worker keeps the original for its cache/reuse,
  // so it can't be transferred away).
  const dem = sim.getDem().slice();

  const refBuffer = refImg.buffer;
  const srcBuffer = srcImg.buffer;
  const warpedBuffer = result.warpedSrc.buffer;
  const demBuffer = dem.buffer;

  ctx.postMessage(
    {
      runId,
      refImg,
      srcImg,
      warped: result.warpedSrc,
      dem,
      matches: result.matches,
      metrics: result.metrics,
      w: W,
      h: H,
    },
    [refBuffer, srcBuffer, warpedBuffer, demBuffer]
  );
};

export {};
