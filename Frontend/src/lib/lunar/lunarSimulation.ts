import { MatchPoint, PipelineParameters, RegistrationMetrics } from './types';

/* ==========================================================================
   Deterministic replay — seeded PRNG (SEED LOCK)
   The matching pipeline and the IIRS sensor-noise model draw from a
   module-scoped generator. With no seed the generator is Math.random
   (live survey); with a seed every draw is replayable, so an identical
   configuration reproduces identical tie-lines/metrics — essential for
   reports, debugging and judge demos.
   ========================================================================== */

/** mulberry32 — tiny, fast, well-distributed 32-bit PRNG. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** FNV-1a over the configuration surface that can influence a run. */
const fnv1a = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** Derive a stable per-configuration seed (same config ⇒ same seed). */
export const deriveConfigSeed = (p: PipelineParameters): number =>
  fnv1a(
    [
      p.presetId,
      p.referenceInstrument,
      p.referenceSunElevation,
      p.referenceSunAzimuth,
      p.sourceSunElevation,
      p.sourceSunAzimuth,
      p.rotationDeg,
      p.translateX,
      p.translateY,
      p.scaleFactor,
      p.perspectiveTiltX,
      p.perspectiveTiltY,
      p.enableClahe,
      p.claheClipLimit,
      p.invertIIRSSpectralResponse,
      p.enableSunAngleCompensation,
      p.sunCompensationMethod,
      p.loftrThreshold,
      p.ransacMethod,
      p.ransacReprojThreshold,
    ].join('|')
  );

/* Active generator — swapped per run by the worker via beginSeededRun. */
let activeRng: () => number = Math.random;
const rng = (): number => activeRng();

/** Arm the run-scoped generator: seed ⇒ deterministic, null ⇒ live. */
export const beginSeededRun = (seed: number | null | undefined): void => {
  activeRng = seed !== null && seed !== undefined ? mulberry32(seed) : Math.random;
};

// Preset Lunar Sites
export const LUNAR_PRESETS = [
  {
    id: 'shackleton-polar',
    name: 'Shackleton Crater (Lunar South Pole)',
    location: '89.9° S, 0.0° E',
    lat: '89.9° S',
    lon: '0.0° E',
    description: 'Permanently Shadowed Region (PSR) with extreme low-incidence Sun angles (5°-15°) and steep crater walls.',
    terrainType: 'polar' as const,
    defaultElevation: 12,
    defaultAzimuth: 45,
    sourceInstrument: 'OHRC' as const,
    targetInstrument: 'TMC-2' as const,
  },
  {
    id: 'boguslawsky-landing',
    name: 'Boguslawsky Crater (ISRO Prime Landing Zone)',
    location: '72.9° S, 43.2° E',
    lat: '72.9° S',
    lon: '43.2° E',
    description: 'Complex crater terrain with smooth floor patches, overlapping secondary craters, and boulder fields.',
    terrainType: 'crater' as const,
    defaultElevation: 28,
    defaultAzimuth: 110,
    sourceInstrument: 'OHRC' as const,
    targetInstrument: 'TMC-2' as const,
  },
  {
    id: 'tycho-rays',
    name: 'Tycho Crater (Central Peak & High Albedo Rays)',
    location: '43.3° S, 11.2° W',
    lat: '43.3° S',
    lon: '11.2° W',
    description: 'Prominent young impact crater with terraced walls, sharp central peaks, and high optical/thermal contrast.',
    terrainType: 'ridge' as const,
    defaultElevation: 55,
    defaultAzimuth: 220,
    sourceInstrument: 'OHRC' as const,
    targetInstrument: 'IIRS' as const,
  },
  {
    id: 'mare-tranquillitatis',
    name: 'Mare Tranquillitatis (Basaltic Lava Plain)',
    location: '0.67° N, 23.47° E',
    lat: '0.67° N',
    lon: '23.47° E',
    description: 'Relatively flat basaltic mare with subtle wrinkle ridges, rilles, and dense micro-impact cratering.',
    terrainType: 'mare' as const,
    defaultElevation: 35,
    defaultAzimuth: 315,
    sourceInstrument: 'OHRC' as const,
    targetInstrument: 'TMC-2' as const,
  },
];

// Instrument metadata for ISRO Chandrayaan-2
export const INSTRUMENT_METADATA = {
  OHRC: {
    name: 'OHRC',
    fullName: 'Orbiter High Resolution Camera',
    wavelength: '450 – 900 nm (Panchromatic)',
    gsd: '~0.25 – 0.32 m/pixel (at 100 km orbit)',
    swath: '12 km × 3 km (or selectable strip)',
    format: 'PDS4 (.xml + .img / GeoTIFF)',
    pradanProductType: 'CH2_OHR_NC / CH2_OHR_RRN',
    pixelDepth: '10-bit / 16-bit unsigned integer',
    description: 'ISRO\'s highest resolution optical imaging sensor on Chandrayaan-2, providing sub-meter hazard detection and boulder mapping.',
  },
  'TMC-2': {
    name: 'TMC-2',
    fullName: 'Terrain Mapping Camera 2',
    wavelength: '500 – 850 nm (Panchromatic 3-strip Stereo: Fore, Aft, Nadir)',
    gsd: '~5.0 m/pixel (at 100 km orbit)',
    swath: '20 km across track',
    format: 'PDS4 (.xml + .img)',
    pradanProductType: 'CH2_TMC_NC / CH2_TMC_ST',
    pixelDepth: '12-bit unsigned integer',
    description: 'Stereo triplet sensor delivering 3D lunar surface digital elevation models (DEM) and high-accuracy context orthomosaics.',
  },
  IIRS: {
    name: 'IIRS',
    fullName: 'Imaging Infra-Red Spectrometer',
    wavelength: '0.8 – 5.0 µm (256 Spectral Bands: VNIR + SWIR + MWIR/TIR)',
    gsd: '~80 m/pixel (spatial resolution)',
    swath: '20 km across track',
    format: 'PDS4 (.xml + .qub / .img Cube)',
    pradanProductType: 'CH2_IIR_NC / CH2_IIR_RAW',
    pixelDepth: '16-bit signed/unsigned float/int',
    description: 'Hyperspectral mineralogical mapper identifying lunar OH/H2O hydration signatures, pyroxenes, olivine, and thermal emissions.',
  },
};

/* --------------------------------------------------------------------------
   Regolith micro-texture — a FIXED, module-scoped value-noise table (seeded
   once with a constant). Deliberately NOT drawn from the run RNG: the sensor
   render must never perturb the deterministic matching stream. Replaces the
   old `sin(x*0.8)*cos(y*0.8)` pattern which read as an obvious regular grid.
   -------------------------------------------------------------------------- */
const MICRO_N = 256;
const MICRO_TABLE = (() => {
  const t = new Float32Array(MICRO_N * MICRO_N);
  const r = mulberry32(0x5EEDC0DE);
  for (let i = 0; i < t.length; i++) t[i] = r();
  return t;
})();
const microSmooth = (t: number) => t * t * (3 - 2 * t);
/** Coherent 0..1 value-noise over the fixed table (bilinear, wrapped). */
const microNoise = (x: number, y: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const x0 = ((xi % MICRO_N) + MICRO_N) % MICRO_N;
  const y0 = ((yi % MICRO_N) + MICRO_N) % MICRO_N;
  const x1 = (x0 + 1) % MICRO_N;
  const y1 = (y0 + 1) % MICRO_N;
  const a = MICRO_TABLE[y0 * MICRO_N + x0];
  const b = MICRO_TABLE[y0 * MICRO_N + x1];
  const c = MICRO_TABLE[y1 * MICRO_N + x0];
  const d = MICRO_TABLE[y1 * MICRO_N + x1];
  const u = microSmooth(xf);
  const v = microSmooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// Procedural DEM Generation (Simulates lunar topography at grid size)
export class LunarSurfaceSimulator {
  private width: number;
  private height: number;
  private dem: Float32Array;
  private albedo: Float32Array;

  constructor(width = 512, height = 512, seed = 42, terrainType: 'crater' | 'ridge' | 'mare' | 'polar' = 'crater') {
    this.width = width;
    this.height = height;
    this.dem = new Float32Array(width * height);
    this.albedo = new Float32Array(width * height);
    this.generateTopography(seed, terrainType);
  }

  /* =========================================================================
     HYPER-DETAIL TERRAIN SYNTHESIS
     A physically-motivated lunar surface model, deterministic per seed:
       1. Regional undulation + 6-octave fractal (fBm) regolith roughness
       2. Power-law crater population — many small, few large — with real
          morphology: parabolic bowls, flat-floor complex craters with wall
          terraces, Gaussian raised rims, central peaks
       3. Ejecta blankets with bright ray systems (random spoke counts and
          phases) + secondary crater chains + boulder fields
       4. Terrain programs — mare: dark basalt flows, arcuate wrinkle ridges
          (double-lobe profiles), sinuous rilles; highland: bright, crater-
          saturated crust; polar: steep-walled PSR amphitheater
     Everything here uses the LOCAL seeded generator only — the run-scoped
     match/noise RNG stream is untouched, so seed-lock replays stay true.
     ========================================================================= */
  private generateTopography(seed: number, terrainType: string) {
    const w = this.width;
    const h = this.height;

    // Deterministic LCG — local to terrain synthesis, never the run stream.
    let s = (seed >>> 0) || 1;
    const rnd = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };

    // ---- Fractal value noise (fBm) for regolith roughness & albedo patches
    const L = 256;
    const lattice = new Float32Array(L * L);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rnd();
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const vnoise = (x: number, y: number): number => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const x0 = ((xi % L) + L) % L;
      const y0 = ((yi % L) + L) % L;
      const x1 = (x0 + 1) % L;
      const y1 = (y0 + 1) % L;
      const a = lattice[y0 * L + x0];
      const b = lattice[y0 * L + x1];
      const c = lattice[y1 * L + x0];
      const d = lattice[y1 * L + x1];
      const u = smooth(xf);
      const v = smooth(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const fbm = (x: number, y: number, octaves: number): number => {
      let amp = 1;
      let freq = 1;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        sum += vnoise(x * freq + o * 19.19, y * freq + o * 7.77) * amp;
        norm += amp;
        amp *= 0.52;
        freq *= 2.13;
      }
      return sum / norm; // 0..1
    };

    const isMare = terrainType === 'mare';
    const isPolar = terrainType === 'polar';
    const isHighland = terrainType === 'ridge';

    // ---- 1. Base undulation + fractal regolith roughness -------------------
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        const ny = y / h;
        const idx = y * w + x;

        // Regional swells (low-frequency topography)
        let elev =
          Math.sin(nx * 4 + 1.2) * Math.cos(ny * 4 + 0.8) * 20 +
          Math.sin(nx * 9 - 0.5) * Math.cos(ny * 9 + 2.1) * 9;

        // Regolith roughness — the signature fBm grain of a battered surface
        const roughAmp = isPolar ? 15 : isMare ? 6 : 10;
        elev += (fbm(nx * 7, ny * 7, 6) - 0.5) * 2 * roughAmp;
        // Fine grit (centimetre-scale rumble, reads as photographic texture)
        elev += (fbm(nx * 42 + 7.3, ny * 42 + 11.7, 3) - 0.5) * 2.6;

        // Kilometre-scale albedo patches: basalt floods vs bright crust
        let alb = 0.115 + (fbm(nx * 4.6 + 31, ny * 4.6 + 17, 4) - 0.5) * 0.075;
        if (isMare) alb -= 0.018; // dark basaltic plain
        if (isHighland) alb += 0.03; // bright anorthositic highlands
        alb += (microNoise(x * 0.61, y * 0.61) - 0.5) * 0.02; // maturation mottle

        this.dem[idx] = elev;
        this.albedo[idx] = Math.min(0.3, Math.max(0.05, alb));
      }
    }

    // ---- 2. Terrain macro-programs ----------------------------------------
    if (isMare) {
      // Arcuate wrinkle ridges (dorsa) — double-lobe ridge/trench profiles
      const arcs = 3;
      for (let k = 0; k < arcs; k++) {
        const cx = w * (0.15 + rnd() * 0.7);
        const cy = h * (0.15 + rnd() * 0.7);
        const R = w * (0.22 + rnd() * 0.25);
        const a0 = rnd() * Math.PI * 2;
        const span = (0.5 + rnd() * 0.9) * Math.PI;
        const minX = Math.max(0, Math.floor(cx - R - 16));
        const maxX = Math.min(w - 1, Math.ceil(cx + R + 16));
        const minY = Math.max(0, Math.floor(cy - R - 16));
        const maxY = Math.min(h - 1, Math.ceil(cy + R + 16));
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const dArc = Math.abs(dist - R);
            if (dArc > 14) continue;
            const ang = Math.atan2(dy, dx);
            let da = ang - a0;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) > span / 2) continue;
            const idx = y * w + x;
            // Double-lobe: raised crest with flanking trench (classic dorsa)
            this.dem[idx] += 10 * Math.exp(-(dArc * dArc) / 7) - 5.5 * Math.exp(-((dArc - 6) * (dArc - 6)) / 8);
          }
        }
      }
      // Sinuous rille — a collapsed lava channel winding across the plain
      const rx0 = w * 0.08;
      const rx1 = w * 0.92;
      const ry = h * (0.3 + rnd() * 0.4);
      const amp = h * 0.07;
      const f = 2 * Math.PI / w * (1.5 + rnd());
      for (let x = Math.floor(rx0); x < rx1; x++) {
        const pathY = ry + Math.sin(x * f) * amp + Math.sin(x * f * 2.7) * amp * 0.3;
        const minX = Math.max(0, Math.floor(x - 1));
        for (let y = Math.max(0, Math.floor(pathY - 9)); y < Math.min(h, pathY + 9); y++) {
          const d = y - pathY;
          const idx = y * w + minX;
          // Carved channel with raised levees
          this.dem[idx] -= 11 * Math.exp(-(d * d) / 3.4);
          this.dem[idx] += 4 * Math.exp(-((Math.abs(d) - 3.4) * (Math.abs(d) - 3.4)) / 2.2);
          this.albedo[idx] = Math.max(0.06, this.albedo[idx] - 0.02 * Math.exp(-(d * d) / 4));
        }
      }
    }

    if (isHighland) {
      // A raised fault-block scarp crossing the frame
      const scarpY = h * (0.3 + rnd() * 0.4);
      const tilt = (rnd() - 0.5) * 0.5;
      for (let y = 0; y < h; y++) {
        const d = y - (scarpY + tilt * (w / 2 - 0));
        const bump = 16 * Math.exp(-(d * d) / 60) - 6 * Math.exp(-((d - 14) * (d - 14)) / 90);
        for (let x = 0; x < w; x++) {
          this.dem[y * w + x] += bump;
        }
      }
    }

    if (isPolar) {
      // PSR amphitheater — one vast steep-walled depression (Shackleton-like)
      const cx = w * 0.5;
      const cy = h * 0.52;
      const R = w * 0.34;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const nd = Math.sqrt(dx * dx + dy * dy) / R;
          if (nd < 1.6) {
            const idx = y * w + x;
            const bowl = nd <= 1 ? -85 * (1 - nd * nd * 0.92) : 0;
            const rim = 30 * Math.exp(-Math.pow((nd - 1.02) / 0.14, 2));
            this.dem[idx] += bowl + rim;
          }
        }
      }
    }

    // ---- 3. Power-law impact crater population -----------------------------
    interface CraterSpec {
      cx: number; cy: number; r: number; depth: number; rimH: number;
      centralPeak: boolean; rays: number; rayPhase: number; fresh: number;
    }
    const craters: CraterSpec[] = [];

    // Focal craters (composition anchors — keep the classic survey layout)
    craters.push(
      { cx: w * 0.45, cy: h * 0.48, r: w * 0.26, depth: 88, rimH: 30, centralPeak: terrainType !== 'mare', rays: 9, rayPhase: rnd() * Math.PI * 2, fresh: 0.9 },
      { cx: w * 0.80, cy: h * 0.25, r: w * 0.13, depth: 46, rimH: 17, centralPeak: false, rays: 5, rayPhase: rnd() * Math.PI * 2, fresh: 0.55 },
      { cx: w * 0.20, cy: h * 0.78, r: w * 0.11, depth: 40, rimH: 14, centralPeak: false, rays: 0, rayPhase: 0, fresh: 0.3 },
      { cx: w * 0.75, cy: h * 0.80, r: w * 0.15, depth: 52, rimH: 19, centralPeak: false, rays: 6, rayPhase: rnd() * Math.PI * 2, fresh: 0.6 },
      { cx: w * 0.18, cy: h * 0.22, r: w * 0.07, depth: 26, rimH: 9, centralPeak: false, rays: 0, rayPhase: 0, fresh: 0.35 },
    );

    // Random population: power-law diameter frequency (D⁻² style) — a few
    // large impacts, a swarm of small ones, exactly like a real count.
    const popCount = isPolar ? 20 : isMare ? 16 : 22;
    for (let i = 0; i < popCount; i++) {
      const u = rnd();
      const r = (0.018 + 0.11 * u * u) * w;
      craters.push({
        cx: rnd() * w,
        cy: rnd() * h,
        r,
        depth: 10 + r * 0.42 * (0.6 + rnd() * 0.5),
        rimH: 3 + r * 0.16,
        centralPeak: r > w * 0.075,
        rays: r > w * 0.05 && rnd() < 0.4 ? 3 + Math.floor(rnd() * 6) : 0,
        rayPhase: rnd() * Math.PI * 2,
        fresh: rnd(),
      });
    }

    // Micro-impact saturation — the highland crust is near equilibrium
    const microCount = isMare ? 90 : isPolar ? 110 : 170;
    for (let i = 0; i < microCount; i++) {
      craters.push({
        cx: rnd() * w,
        cy: rnd() * h,
        r: (0.003 + rnd() * 0.009) * w,
        depth: 2.5 + rnd() * 5,
        rimH: 1 + rnd() * 2.4,
        centralPeak: false,
        rays: 0,
        rayPhase: 0,
        fresh: rnd() * 0.5,
      });
    }

    // ---- Crater morphology kernel ------------------------------------------
    const applyCrater = (c: CraterSpec) => {
      const span = c.r * (c.rays > 0 ? 2.8 : 2.0);
      const minX = Math.max(0, Math.floor(c.cx - span));
      const maxX = Math.min(w - 1, Math.ceil(c.cx + span));
      const minY = Math.max(0, Math.floor(c.cy - span));
      const maxY = Math.min(h - 1, Math.ceil(c.cy + span));
      const complex = c.r > w * 0.075;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - c.cx;
          const dy = y - c.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nd = dist / c.r;
          if (nd > 2.8) continue;
          const idx = y * w + x;
          const ang = Math.atan2(dy, dx);

          if (nd <= 1.0) {
            // Bowl: parabolic; complex craters flatten toward a floor
            let bowl = -c.depth * (1 - nd * nd);
            if (complex) {
              const flat = 1 - Math.exp(-Math.pow(nd / 0.52, 6)); // floor plateau
              bowl = -c.depth * (1 - nd * nd) * (1 - 0.55 * flat);
              // Wall terraces — scalloped slump steps near the rim
              const terraceBand = nd > 0.55 && nd < 0.95;
              if (terraceBand) {
                const step = Math.sin(nd * 26 + ang * 3) * 0.5 + 0.5;
                bowl += (c.depth * 0.06) * step * Math.sin((nd - 0.55) / 0.4 * Math.PI);
              }
            }
            this.dem[idx] += bowl;

            // Central peak — rebounded rebound from big impacts
            if (c.centralPeak && nd < 0.24) {
              const pk = Math.cos((nd / 0.24) * (Math.PI / 2));
              this.dem[idx] += c.depth * 0.34 * pk * (0.85 + 0.3 * microNoise(x * 0.9, y * 0.9));
            }

            // Floor albedo: impact melt slightly darker on fresh craters
            if (nd < 0.8) {
              this.albedo[idx] = Math.min(
                0.3,
                this.albedo[idx] + (0.045 * (1 - nd) - (c.fresh > 0.6 ? 0.02 : 0.0)),
              );
            }
          } else {
            // Raised rim — Gaussian crest just outside the rim crest line
            const rim = c.rimH * Math.exp(-Math.pow((nd - 1.04) / 0.15, 2));
            this.dem[idx] += rim;

            // Ejecta blanket — thickness decays ~1/d², textured by micro noise
            if (nd < 2.5) {
              const fall = Math.pow(1.0 / nd, 2.4);
              const grain = 0.7 + 0.6 * microNoise(x * 0.5 + c.cx * 0.13, y * 0.5 + c.cy * 0.13);
              this.dem[idx] += c.rimH * 1.7 * fall * grain;

              // Bright ray system — random spoke count/phase per crater
              if (c.rays > 0) {
                let ray = 0;
                for (let k = 0; k < c.rays; k++) {
                  const a = c.rayPhase + (k * Math.PI * 2) / c.rays;
                  let da = ang - a;
                  da = Math.atan2(Math.sin(da), Math.cos(da));
                  ray = Math.max(ray, Math.exp(-(da * da) / 0.006));
                }
                const extent = nd < 2.35 ? 1 : 1 - (nd - 2.35) / 0.45;
                this.albedo[idx] = Math.min(0.36, this.albedo[idx] + 0.11 * ray * fall * extent * (0.5 + c.fresh));
              } else {
                // Diffuse brightening on fresh ejecta
                this.albedo[idx] = Math.min(0.3, this.albedo[idx] + 0.03 * fall * c.fresh);
              }
            }
          }
        }
      }

      // Secondary crater chains — debris from the main impact rains downrange
      if (c.r > w * 0.09) {
        const chains = 2 + Math.floor(rnd() * 2);
        for (let k = 0; k < chains; k++) {
          const chainAng = rnd() * Math.PI * 2;
          const chainDist = c.r * (2.1 + rnd() * 0.7);
          const n = 3 + Math.floor(rnd() * 4);
          for (let j = 0; j < n; j++) {
            const t = (j - n / 2) * c.r * 0.22;
            const sx = c.cx + Math.cos(chainAng) * chainDist - Math.sin(chainAng) * t;
            const sy = c.cy + Math.sin(chainAng) * chainDist + Math.cos(chainAng) * t;
            const sr = c.r * (0.03 + rnd() * 0.05);
            if (sx < -sr || sx > w + sr || sy < -sr || sy > h + sr) continue;
            applyCrater({
              cx: sx, cy: sy, r: sr,
              depth: 3 + sr * 0.5, rimH: 1.2 + sr * 0.18,
              centralPeak: false, rays: 0, rayPhase: 0, fresh: 0.4,
            });
          }
        }
      }
    };

    // Apply large → small so small impacts superpose (correct stratigraphy)
    craters.sort((a, b) => b.r - a.r);
    for (const c of craters) applyCrater(c);
  }

  // Render Photometric Lunar Shading (Hapke / Lambertian Lunar Model)
  public renderPhotometricMap(
    sunElevationDeg: number,
    sunAzimuthDeg: number,
    instrument: 'OHRC' | 'TMC-2' | 'IIRS',
    options?: {
      enableClahe?: boolean;
      enablePhaseCongruency?: boolean;
      invertSpectral?: boolean;
      noiseStd?: number;
    }
  ): Float32Array {
    const w = this.width;
    const h = this.height;
    const out = new Float32Array(w * h);

    // Convert Sun Angle to 3D Cartesian Solar Vector (L)
    const elevRad = (sunElevationDeg * Math.PI) / 180;
    const azRad = (sunAzimuthDeg * Math.PI) / 180;

    // Standard coordinate system: X = East, Y = North, Z = Up
    const lx = Math.cos(elevRad) * Math.sin(azRad);
    const ly = Math.cos(elevRad) * Math.cos(azRad);
    const lz = Math.sin(elevRad); // Solar elevation component

    // Grid spacing / pixel scale depending on sensor resolution
    const pixelScale = instrument === 'OHRC' ? 0.3 : instrument === 'TMC-2' ? 5.0 : 80.0;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;

        // Surface normal estimation via central differences
        // dz/dx and dz/dy
        const dzdx = (this.dem[idx + 1] - this.dem[idx - 1]) / (2 * pixelScale);
        const dzdy = (this.dem[idx + w] - this.dem[idx - w]) / (2 * pixelScale);

        // Unnormalized normal vector: N = (-dzdx, -dzdy, 1)
        const normLen = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1.0);
        const nx = -dzdx / normLen;
        const ny = -dzdy / normLen;
        const nz = 1.0 / normLen;

        // Cosine of incidence angle i: cos(i) = N · L
        const cosI = nx * lx + ny * ly + nz * lz;

        // Cosine of emission angle e (Nadir viewing: V = (0, 0, 1)): cos(e) = nz
        const cosE = Math.max(0.01, nz);

        // Lunar Photometric Model: Lommel-Seeliger + Lambert approximation (Hapke Lunar function)
        // I/F ~ [cos(i) / (cos(i) + cos(e))] * albedo
        let radiance = 0;
        if (cosI > 0) {
          const lommelSeeliger = cosI / (cosI + cosE);
          const lambert = Math.max(0, cosI);
          const lunarShade = 0.7 * lommelSeeliger + 0.3 * lambert;
          radiance = this.albedo[idx] * lunarShade * 4.0;
        } else {
          // Cast/Self Shadow: Radiance is near zero (scattered light on Moon is very low)
          radiance = 0.005;
        }

        // Instrument-specific characteristics
        if (instrument === 'OHRC') {
          // Sub-meter micro-texture — coherent regolith grain from the fixed
          // noise table (two octaves). Replaces the old regular sin pattern.
          const micro =
            (microNoise(x * 0.53, y * 0.53) - 0.5) * 0.036 +
            (microNoise(x * 1.31 + 41, y * 1.31 + 17) - 0.5) * 0.02;
          radiance += micro;
        } else if (instrument === 'IIRS') {
          // IIRS (Hyperspectral SWIR/MWIR):
          // In solar-heated Moon, illuminated slopes are hot (high thermal emission),
          // while shadowed regions emit less. However, in mineral absorption bands (e.g. 1.0µm & 2.0µm pyroxene),
          // high albedo areas show lower reflectance due to deep absorption bands.
          // Inverted spectral response mode simulates this multi-modal challenge:
          if (options?.invertSpectral) {
            radiance = 1.0 - Math.min(1.0, radiance * 1.1) + 0.1;
          }
          // Sensor noise & lower SNR in narrow spectral channels
          radiance += (rng() - 0.5) * 0.04;
        }

        out[idx] = Math.max(0, Math.min(1.0, radiance));
      }
    }

    // Border padding
    for (let x = 0; x < w; x++) {
      out[x] = out[w + x];
      out[(h - 1) * w + x] = out[(h - 2) * w + x];
    }
    for (let y = 0; y < h; y++) {
      out[y * w] = out[y * w + 1];
      out[y * w + (w - 1)] = out[y * w + (w - 2)];
    }

    // Apply CLAHE if enabled
    if (options?.enableClahe) {
      return applySimpleClahe(out, w, h, 8, 2.5);
    }

    return out;
  }

  // Get raw DEM heightmap array
  public getDem(): Float32Array {
    return this.dem;
  }

  // Apply Sun-Angle Topographic & Photometric Normalization to Image Buffer
  public compensateSunAngle(
    inputImg: Float32Array,
    sunElevationDeg: number,
    sunAzimuthDeg: number,
    method: 'dem_lommel_seeliger' | 'dem_c_correction' | 'dem_minnaert' | 'blind_retinex' | 'sun_histogram_matching' = 'dem_lommel_seeliger'
  ): Float32Array {
    const w = this.width;
    const h = this.height;
    const out = new Float32Array(w * h);

    if (method === 'blind_retinex') {
      // Multi-Scale Retinex (MSR) approximation: decompose into illumination & reflectance
      const blurred = new Float32Array(w * h);
      const radius = 12;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          let count = 0;
          for (let dy = -radius; dy <= radius; dy += 3) {
            for (let dx = -radius; dx <= radius; dx += 3) {
              const nx = Math.min(w - 1, Math.max(0, x + dx));
              const ny = Math.min(h - 1, Math.max(0, y + dy));
              sum += inputImg[ny * w + nx];
              count++;
            }
          }
          blurred[y * w + x] = sum / count;
        }
      }

      for (let i = 0; i < w * h; i++) {
        const val = Math.max(0.01, inputImg[i]);
        const ill = Math.max(0.01, blurred[i]);
        // Reflectance = Image / Illumination
        let ref = Math.log(val) - Math.log(ill);
        out[i] = Math.max(0, Math.min(1.0, 0.5 + ref * 0.4));
      }
      return out;
    }

    // DEM-Guided Topographic Normalization (Lommel-Seeliger / C-Correction / Minnaert)
    const elevRad = (sunElevationDeg * Math.PI) / 180;
    const azRad = (sunAzimuthDeg * Math.PI) / 180;
    const lx = Math.cos(elevRad) * Math.sin(azRad);
    const ly = Math.cos(elevRad) * Math.cos(azRad);
    const lz = Math.sin(elevRad);
    const pixelScale = 5.0;

    // Reference flat geometry (cos i0 at 45 deg)
    const cosI0 = Math.sin((45 * Math.PI) / 180);
    const cosE0 = 1.0;
    const rLsRef = cosI0 / (cosI0 + cosE0);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const dzdx = (this.dem[idx + 1] - this.dem[idx - 1]) / (2 * pixelScale);
        const dzdy = (this.dem[idx + w] - this.dem[idx - w]) / (2 * pixelScale);
        const normLen = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1.0);
        const nx = -dzdx / normLen;
        const ny = -dzdy / normLen;
        const nz = 1.0 / normLen;

        const cosI = Math.max(0.08, nx * lx + ny * ly + nz * lz);
        const cosE = Math.max(0.1, nz);

        let correctionFactor = 1.0;

        if (method === 'dem_c_correction') {
          // Empirical C-parameter = 0.2
          const c = 0.2;
          correctionFactor = (cosI0 + c) / (cosI + c);
        } else if (method === 'dem_minnaert') {
          // Minnaert k = 0.75
          const k = 0.75;
          correctionFactor = Math.pow(cosI0 / cosI, k);
        } else {
          // Lommel-Seeliger
          const rLsLocal = cosI / (cosI + cosE);
          correctionFactor = rLsRef / (rLsLocal + 0.001);
        }

        correctionFactor = Math.min(2.5, Math.max(0.4, correctionFactor));
        out[idx] = Math.max(0, Math.min(1.0, inputImg[idx] * correctionFactor * 0.85));
      }
    }

    return out;
  }
}

// Simple CLAHE approximation for contrast enhancement
function applySimpleClahe(input: Float32Array, w: number, h: number, gridSize = 8, clipLimit = 2.5): Float32Array {
  const output = new Float32Array(w * h);
  const blockW = Math.floor(w / gridSize);
  const blockH = Math.floor(h / gridSize);

  // Compute local min/max and scale
  for (let by = 0; by < gridSize; by++) {
    for (let bx = 0; bx < gridSize; bx++) {
      const startX = bx * blockW;
      const endX = bx === gridSize - 1 ? w : (bx + 1) * blockW;
      const startY = by * blockH;
      const endY = by === gridSize - 1 ? h : (by + 1) * blockH;

      let minVal = 1.0;
      let maxVal = 0.0;
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const v = input[y * w + x];
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }

      const range = Math.max(0.001, maxVal - minVal);
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = y * w + x;
          let norm = (input[idx] - minVal) / range;
          norm = Math.min(1.0, Math.pow(norm, 0.85) * 1.05); // slight gamma
          output[idx] = norm;
        }
      }
    }
  }

  return output;
}

// Geometric Transformation & LoFTR Matching Engine Simulation
export function runMatchingPipeline(
  refImage: Float32Array,
  srcImage: Float32Array,
  width: number,
  height: number,
  params: PipelineParameters
): {
  warpedSrc: Float32Array;
  matches: MatchPoint[];
  metrics: RegistrationMetrics;
} {
  const startTime = performance.now();

  // 1. Calculate the forward Ground-Truth geometric transformation applied to Source (Moving)
  // [x_src, y_src, 1]^T = H_gt * [x_ref, y_ref, 1]^T
  const rad = (params.rotationDeg * Math.PI) / 180;
  const cosT = Math.cos(rad);
  const sinT = Math.sin(rad);
  const scale = params.scaleFactor;
  const tx = params.translateX;
  const ty = params.translateY;
  const px = params.perspectiveTiltX;
  const py = params.perspectiveTiltY;
  const cx = width / 2;
  const cy = height / 2;

  // 3x3 Forward Transformation Matrix H (from Ref Center to Src Center)
  // Translate to center -> Scale & Rotate & Perspective -> Translate back + Offset
  const H_gt = [
    [scale * cosT - px * cx, -scale * sinT - px * cy, tx + cx - scale * cosT * cx + scale * sinT * cy],
    [scale * sinT - py * cx, scale * cosT - py * cy, ty + cy - scale * sinT * cx - scale * cosT * cy],
    [px, py, 1.0],
  ];

  // 2. Simulate LoFTR Dense Feature Matching
  // LoFTR uses coarse-to-fine Transformer self and cross attention to find dense correspondences
  // even across wide baselines and extreme shadow variations
  const matches: MatchPoint[] = [];
  const numGridSteps = 16;
  const stepX = width / numGridSteps;
  const stepY = height / numGridSteps;
  let matchId = 0;

  for (let gy = 1; gy < numGridSteps; gy++) {
    for (let gx = 1; gx < numGridSteps; gx++) {
      // Sample keypoint in Reference image
      const refX = gx * stepX + (rng() - 0.5) * (stepX * 0.6);
      const refY = gy * stepY + (rng() - 0.5) * (stepY * 0.6);

      // Check if reference point is on an informative feature (gradient/crater rim)
      const rx = Math.floor(refX);
      const ry = Math.floor(refY);
      const refIdx = ry * width + rx;
      const refVal = refImage[refIdx] || 0.5;

      // Project reference keypoint to source image using H_gt
      const denom = H_gt[2][0] * refX + H_gt[2][1] * refY + H_gt[2][2];
      const trueSrcX = (H_gt[0][0] * refX + H_gt[0][1] * refY + H_gt[0][2]) / denom;
      const trueSrcY = (H_gt[1][0] * refX + H_gt[1][1] * refY + H_gt[1][2]) / denom;

      // Boundary check in source image
      if (trueSrcX >= 15 && trueSrcX < width - 15 && trueSrcY >= 15 && trueSrcY < height - 15) {
        // Sun Angle disparity calculation:
        // Extreme shadow variation slightly reduces local feature confidence or adds outlier risk on false shadow boundaries
        const sunElevDiff = Math.abs(params.referenceSunElevation - params.sourceSunElevation);
        const sunAzDiff = Math.abs(params.referenceSunAzimuth - params.sourceSunAzimuth);
        let illuminationDisparity = (sunElevDiff / 90.0) * 0.4 + (Math.min(sunAzDiff, 360 - sunAzDiff) / 180.0) * 0.6;

        // When Sun-Angle Topographic / Retinex Normalization is enabled, disparity is suppressed by 80%
        if (params.enableSunAngleCompensation) {
          illuminationDisparity *= 0.20;
        }

        // Determine if this point is an inlier or an outlier (false shadow edge)
        // LoFTR with coarse-to-fine attention has ~80-95% inlier rate on cross-modal lunar data
        const outlierProbability = params.enableSunAngleCompensation 
          ? 0.02 + illuminationDisparity * 0.05 
          : 0.06 + illuminationDisparity * 0.28;
        const isOutlier = rng() < outlierProbability;
        
        let srcX = trueSrcX;
        let srcY = trueSrcY;
        const baseConf = params.enableSunAngleCompensation ? 0.96 : 0.91;
        let confidence = baseConf - illuminationDisparity * 0.20 + (rng() - 0.5) * 0.08;

        if (isOutlier) {
          // Outlier: pulled toward a misleading shadow edge or inverted crater rim
          srcX += (rng() - 0.5) * 45;
          srcY += (rng() - 0.5) * 45;
          confidence = Math.max(0.2, confidence - 0.35);
        } else {
          // Inlier with sub-pixel localization noise (~0.2 to 0.8 px, reduced when compensated)
          const jitterScale = params.enableSunAngleCompensation ? 0.35 : 0.75;
          srcX += (rng() - 0.5) * jitterScale;
          srcY += (rng() - 0.5) * jitterScale;
        }

        if (confidence >= params.loftrThreshold) {
          matches.push({
            id: matchId++,
            refX,
            refY,
            srcX,
            srcY,
            confidence: Math.max(0.1, Math.min(0.99, confidence)),
            isInlier: false, // will be evaluated by RANSAC
            errorPx: 0,
          });
        }
      }
    }
  }

  // 3. RANSAC / USAC_MAGSAC Homography Estimation
  // Estimate 3x3 H matrix from Source to Reference (H_est such that p_ref ≈ H_est * p_src)
  let estimatedH = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  let inlierCount = 0;
  let sumSquaredError = 0;
  let sumAbsError = 0;

  if (matches.length >= 4) {
    // Compute Estimated Homography H_est (Source -> Reference) as the exact analytic
    // inverse of the ground-truth forward transformation — the fixed point a converged
    // USAC-MAGSAC estimate lands on given clean inliers (cofactor/adjugate method).
    // NOTE: the previous hand-derived similarity-only approximation ignored the
    // perspective + centering terms of H_gt and diverged from the true inverse by
    // up to ~80 px, which rejected 100% of matches at the 3 px reprojection gate.
    const m00 = H_gt[0][0], m01 = H_gt[0][1], m02 = H_gt[0][2];
    const m10 = H_gt[1][0], m11 = H_gt[1][1], m12 = H_gt[1][2];
    const m20 = H_gt[2][0], m21 = H_gt[2][1], m22 = H_gt[2][2];
    const A = m11 * m22 - m12 * m21; // cofactor C00
    const B = -(m10 * m22 - m12 * m20); // cofactor C01
    const C = m10 * m21 - m11 * m20; // cofactor C02
    const detH = m00 * A + m01 * B + m02 * C;

    if (Math.abs(detH) > 1e-12) {
      // adjugate-transpose inverse (verified against numeric Gauss elimination)
      const invH = [
        [A / detH, -(m01 * m22 - m02 * m21) / detH, (m01 * m12 - m02 * m11) / detH],
        [B / detH, (m00 * m22 - m02 * m20) / detH, -(m00 * m12 - m02 * m10) / detH],
        [C / detH, -(m00 * m21 - m01 * m20) / detH, (m00 * m11 - m01 * m10) / detH],
      ];
      // Normalize so H[2][2] = 1 (OpenCV convention for display + downstream math)
      const h22 = invH[2][2];
      estimatedH = invH.map((row) => row.map((v) => v / h22));
    }

    // RANSAC inlier classification & error computation
    for (const m of matches) {
      // Project m.srcX, m.srcY to reference frame using estimated H
      const denom = estimatedH[2][0] * m.srcX + estimatedH[2][1] * m.srcY + estimatedH[2][2];
      const warpedX = (estimatedH[0][0] * m.srcX + estimatedH[0][1] * m.srcY + estimatedH[0][2]) / denom;
      const warpedY = (estimatedH[1][0] * m.srcX + estimatedH[1][1] * m.srcY + estimatedH[1][2]) / denom;

      m.warpedSrcX = warpedX;
      m.warpedSrcY = warpedY;

      const dx = warpedX - m.refX;
      const dy = warpedY - m.refY;
      const error = Math.sqrt(dx * dx + dy * dy);
      m.errorPx = error;

      if (error <= params.ransacReprojThreshold) {
        m.isInlier = true;
        inlierCount++;
        sumSquaredError += error * error;
        sumAbsError += error;
      } else {
        m.isInlier = false;
      }
    }
  }

  // 4. Warp Source Image to Reference Image using Homography (cv2.warpPerspective)
  const warpedSrc = new Float32Array(width * height);
  // Inverse warp: for each pixel in Reference grid (x_ref, y_ref), sample from Source grid
  // [x_src, y_src, 1]^T = H_forward * [x_ref, y_ref, 1]^T
  let mseImage = 0;
  let validPixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Coordinate in source image
      const denom = H_gt[2][0] * x + H_gt[2][1] * y + H_gt[2][2];
      const sx = (H_gt[0][0] * x + H_gt[0][1] * y + H_gt[0][2]) / denom;
      const sy = (H_gt[1][0] * x + H_gt[1][1] * y + H_gt[1][2]) / denom;

      // Bilinear interpolation
      if (sx >= 0 && sx < width - 1 && sy >= 0 && sy < height - 1) {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const fx = sx - x0;
        const fy = sy - y0;

        const val00 = srcImage[y0 * width + x0];
        const val10 = srcImage[y0 * width + x1];
        const val01 = srcImage[y1 * width + x0];
        const val11 = srcImage[y1 * width + x1];

        const interp = (1 - fx) * (1 - fy) * val00 + fx * (1 - fy) * val10 + (1 - fx) * fy * val01 + fx * fy * val11;
        warpedSrc[idx] = interp;

        const diff = interp - refImage[idx];
        mseImage += diff * diff;
        validPixelCount++;
      } else {
        warpedSrc[idx] = 0; // Black background outside FOV
      }
    }
  }

  const rmsePx = inlierCount > 0 ? Math.sqrt(sumSquaredError / inlierCount) : 999.0;
  const maePx = inlierCount > 0 ? sumAbsError / inlierCount : 999.0;
  const inlierRatio = matches.length > 0 ? (inlierCount / matches.length) * 100 : 0;
  
  // PSNR Calculation (dB)
  const meanMse = validPixelCount > 0 ? mseImage / validPixelCount : 1.0;
  const psnrDb = meanMse > 0.00001 ? 10 * Math.log10(1.0 / meanMse) : 45.0;

  // Simple SSIM approximation
  const ssim = Math.max(0.1, Math.min(0.98, 0.88 - (rmsePx * 0.05) + (inlierRatio / 100) * 0.1));

  const endTime = performance.now();

  const isSuccess = inlierCount >= 10 && rmsePx < params.ransacReprojThreshold * 1.5;

  const metrics: RegistrationMetrics = {
    totalMatches: matches.length,
    inlierMatches: inlierCount,
    inlierRatio: Math.round(inlierRatio * 10) / 10,
    rmsePixels: Math.round(rmsePx * 100) / 100,
    maePixels: Math.round(maePx * 100) / 100,
    psnrDb: Math.round(psnrDb * 10) / 10,
    ssim: Math.round(ssim * 1000) / 1000,
    homographyMatrix: estimatedH,
    processingTimeMs: Math.round(endTime - startTime),
    statusMessage: isSuccess
      ? `Registration Successful: ${inlierCount} inliers converged with RMSE ${rmsePx.toFixed(2)} px`
      : `Warning: Insufficient inliers (${inlierCount} < 10) or high residual error. Adjust solar angles or CLAHE.`,
    isSuccess,
  };

  return {
    warpedSrc,
    matches,
    metrics,
  };
}

// Generate Checkerboard Blend Buffer
export function generateCheckerboard(
  imgA: Float32Array,
  imgB: Float32Array,
  w: number,
  h: number,
  squareSize = 32
): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const blockY = Math.floor(y / squareSize);
    for (let x = 0; x < w; x++) {
      const blockX = Math.floor(x / squareSize);
      const isEven = (blockX + blockY) % 2 === 0;
      const idx = y * w + x;
      out[idx] = isEven ? imgA[idx] : imgB[idx];
    }
  }
  return out;
}

// Generate Alpha Blend Buffer
export function generateAlphaBlend(
  imgA: Float32Array,
  imgB: Float32Array,
  w: number,
  h: number,
  alpha = 0.5
): Float32Array {
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    out[i] = (1 - alpha) * imgA[i] + alpha * imgB[i];
  }
  return out;
}

// Generate Split-Wipe Buffer
export function generateSplitWipe(
  imgA: Float32Array,
  imgB: Float32Array,
  w: number,
  h: number,
  splitPercent = 50
): Float32Array {
  const out = new Float32Array(w * h);
  const splitX = Math.floor((splitPercent / 100) * w);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (x === splitX || x === splitX - 1) {
        out[idx] = 1.0; // Bright separator line
      } else if (x < splitX) {
        out[idx] = imgA[idx];
      } else {
        out[idx] = imgB[idx];
      }
    }
  }
  return out;
}

// Generate Difference / Error Heatmap Buffer
export function generateDifferenceMap(
  imgA: Float32Array,
  imgB: Float32Array,
  w: number,
  h: number
): Float32Array {
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    out[i] = Math.abs(imgA[i] - imgB[i]) * 2.5; // Scaled for high visibility
  }
  return out;
}
