export interface LunarScenePreset {
  id: string;
  name: string;
  location: string;
  lat: string;
  lon: string;
  description: string;
  terrainType: 'crater' | 'ridge' | 'mare' | 'polar';
  defaultElevation: number;
  defaultAzimuth: number;
  sourceInstrument: 'OHRC';
  targetInstrument: 'TMC-2' | 'IIRS';
}

export interface InstrumentSpecs {
  name: string;
  fullName: string;
  wavelength: string;
  gsd: string;
  swath: string;
  format: string;
  pradanProductType: string;
  pixelDepth: string;
  description: string;
}

export interface PipelineParameters {
  presetId: string;
  referenceInstrument: 'TMC-2' | 'IIRS';
  sourceInstrument: 'OHRC';
  
  // Illumination & Sun Angle
  referenceSunElevation: number; // degrees (e.g., 25°)
  referenceSunAzimuth: number;   // degrees (e.g., 45°)
  sourceSunElevation: number;    // degrees (e.g., 65°)
  sourceSunAzimuth: number;       // degrees (e.g., 225°)
  
  // Geometric Displacements
  rotationDeg: number;          // degrees (-45 to 45)
  translateX: number;           // pixels (-80 to 80)
  translateY: number;           // pixels (-80 to 80)
  scaleFactor: number;          // relative zoom scale (0.5 to 2.0)
  perspectiveTiltX: number;     // perspective shear (-0.001 to 0.001)
  perspectiveTiltY: number;     // perspective shear (-0.001 to 0.001)
  
  // Preprocessing Options
  pyramidDownsampleLevels: number; // 1 to 5
  enableClahe: boolean;
  claheClipLimit: number;
  enablePhaseCongruency: boolean;
  invertIIRSSpectralResponse: boolean;
  percentileStretchLow: number;
  percentileStretchHigh: number;

  // Sun Angle & Topographic Illumination Compensation
  enableSunAngleCompensation: boolean;
  sunCompensationMethod: 'dem_lommel_seeliger' | 'dem_c_correction' | 'dem_minnaert' | 'blind_retinex' | 'sun_histogram_matching';
  useDemPhotometry: boolean;
  retinexSigma: number;
  minnaertK: number;
  cParameter: number;
  
  // LoFTR / LightGlue & RANSAC Matching
  matcherAlgorithm: 'LoFTR' | 'LightGlue' | 'SIFT_Benchmark';
  loftrThreshold: number;       // 0.1 to 0.9
  ransacMethod: 'USAC_MAGSAC' | 'RANSAC' | 'LMEDS';
  ransacReprojThreshold: number; // 1.0 to 10.0 pixels
  ransacConfidence: number;     // 0.95 to 0.999

  // Deterministic replay — when set, the match/sensor RNG is seeded so an
  // identical configuration replays identical matches (SEED LOCK in the UI).
  rngSeed?: number | null;
  
  // View Settings
  viewMode: 'side-by-side' | 'matches' | 'checkerboard' | 'alpha-blend' | 'split-wipe' | 'difference-heatmap' | '3d-terrain';
  checkerboardSize: number;     // pixels (16 to 128)
  blendAlpha: number;           // 0 to 1
  splitWipePosition: number;    // 0 to 100%
  showKeypointLines: boolean;
  minConfidenceFilter: number;  // 0 to 1
}

export interface VlmAnalysisResult {
  status: 'success' | 'error' | 'no-api-key';
  summary: string;
  craterAnalysis: string;
  elevationDifferences: string;
  hazardAssessment: string;
  registrationQuality: string;
  confidence: number; // 0 to 1
  rawResponse?: string;
  /** True when the report was synthesized locally (demo mode, no API key). */
  demo?: boolean;
  /** Which engine produced the report — Puter multi-model, direct Gemini, or demo. */
  engine?: 'puter' | 'gemini' | 'demo';
  /** Model id when a live engine ran (e.g. 'gpt-4o', 'claude-sonnet-4'). */
  model?: string;
}

export interface MatchPoint {
  id: number;
  refX: number;
  refY: number;
  srcX: number;
  srcY: number;
  warpedSrcX?: number;
  warpedSrcY?: number;
  confidence: number;
  isInlier: boolean;
  errorPx: number;
}

export interface RegistrationMetrics {
  totalMatches: number;
  inlierMatches: number;
  inlierRatio: number; // 0 to 100%
  rmsePixels: number;  // Root Mean Square Error in px
  maePixels: number;   // Mean Absolute Error
  psnrDb: number;      // Peak Signal to Noise Ratio
  ssim: number;        // Structural Similarity Index (-1 to 1)
  homographyMatrix: number[][]; // 3x3 matrix
  processingTimeMs: number;
  statusMessage: string;
  isSuccess: boolean;
}

export type ActiveTab =
  | 'workbench'
  | 'brief'
  | 'explorer'
  | 'phase1'
  | 'phase2'
  | 'phase3'
  | 'phase4'
  | 'atlas'
  | 'colab-notebook';

/* A just-in-time acquired site — born in the Explorer from a coordinate
   bounding box, handed to the workbench as a fully-formed register entry.
   Deterministic: the same ROI + sensor always derives the same seed, so
   re-acquiring a site reproduces its terrain exactly (seed-lock ethos). */
export interface DynamicSite {
  id: string;                 // 'dyn-<seedHex>'
  name: string;               // 'JIT Site −73.2°, 41.0°' or landmark name
  lat: number;                // signed degrees, +N
  lon: number;                // signed degrees, +E
  spanDeg: number;            // bounding-box edge (deg) — capped ≤ 0.25°
  terrainType: 'crater' | 'ridge' | 'mare' | 'polar';
  seed: number;               // terrain seed derived from ROI + sensor
  sunRefElev: number;         // SPICE-lite reference (TMC-2/IIRS) sun elev
  sunRefAz: number;
  sunSrcElev: number;         // OHRC pass sun geometry
  sunSrcAz: number;
  productId: string;          // 'CH2_TMC_NC_<hash>' style manifest id
  source: 'jit-sim' | 'pradan-live';
  acquiredAt: string;         // HH:MM:SS acquisition stamp
  gsdNote: string;            // effective GSD note for the frame
}
