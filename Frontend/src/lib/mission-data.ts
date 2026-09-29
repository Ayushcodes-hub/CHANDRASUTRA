/**
 * LUNARMATCH 2.0 — Mission data model
 * Static telemetry baselines + shared types for every console module.
 * Values match the DSN reference frames for pass #0482-S (Shackleton rim).
 */

export type ConsoleModule =
  | "orbital"
  | "dem"
  | "photometric"
  | "elevation"
  | "archive";

export const MODULES: { id: ConsoleModule; label: string; short: string }[] = [
  { id: "orbital", label: "ORBITAL REGISTRATION", short: "REG" },
  { id: "dem", label: "3D DEM SYNTHESIS", short: "DEM" },
  { id: "photometric", label: "PHOTOMETRIC LAB", short: "PHOT" },
  { id: "elevation", label: "ELEVATION PROFILES", short: "ELEV" },
  { id: "archive", label: "TELEMETRY ARCHIVE", short: "DSN" },
];

/* ── Mission hierarchy (persistent left rail) ─────────────────── */
export const MISSION = {
  hierarchy: "DSN::ORB-4",
  network: "ISRO/NASA DEEP SPACE NETWORK",
  orbit: "POLAR ORBIT 100KM",
  targetBody: "MOON // LUNA",
  southPoleAlt: "100.42 KM",
  sensors: [
    { name: "TMC-2 STEREO", status: "NOMINAL", tone: "dim" as const },
    { name: "LOLA ALTIMETER", status: "1400 HZ ACTIVE", tone: "gr" as const },
    { name: "SAR DUAL-POL", status: "COHERENT", tone: "gr" as const },
    { name: "SHADOWCAM NIR", status: "EXPOSURE LOCK", tone: "am" as const },
  ],
  ephemeris: {
    velocity: "1.633",
    velocityUnit: "KM/S",
    inclination: "89.94°",
    inclinationUnit: "POL",
    periapsis: "98.41",
    periapsisUnit: "KM",
    apoapsis: "101.89",
    apoapsisUnit: "KM",
  },
  primaryLink: "DSN GOLDSTONE 34M",
  uplink: "7165.2 MHz",
};

/* ── Orbital registration module ─────────────────────────────── */
export const ORBITAL = {
  pass: "#0482-S",
  frame: "CH2_TMC2_OHRC_REG",
  sync: "1400HZ",
  pyramidRatio: "20:1",
  octaves: "L0 ↔ L5",
  ref: {
    id: "REF: CH2 TMC-2",
    mode: "STEREO NADIR",
    gsd: "5.0",
    alt: "100.2",
    nadir: "0.04°",
    spec: "500-850 nm",
  },
  src: {
    id: "SRC: CH2 OHRC",
    mode: "ULTRA-HIGH RES",
    gsd: "0.25",
    solar: "82.4° GRAZ",
    exp: "1.42 ms",
    band: "PAN WIDE",
  },
  solar: { elevDeg: 18.4, azDeg: 45.2, azDir: "NE", psrRatio: 62.1 },
  strategies: ["Lommel-Seeliger", "Minnaert (k=0.74)", "RX Retinex", "Hapke", "C-Corr"],
  solver: "R_norm = I_obs × [ R_LS(i,θ₀, e,φ) / R_LS(i, e) ]",
  target: "SHACKLETON RIM",
  targetCoord: "[89.9°S, 0.0°E]",
  zoom: "4.8×",
  fov: "34°",
  elevFloor: "-4,280m",
  elevRim: "+1,120m",
  convergence: {
    pct: 98.9,
    inliers: 178,
    inliersTotal: 180,
    rmse: "0.13",
    psnr: "10.74",
    ssim: "0.972",
    residual: "0.082",
    epipolar: "0.019°",
  },
  pipeline: [
    { id: "01", name: "PDS4 Ingest & Radiometric Cal", ms: 42, status: "COMPLETED" as const },
    { id: "02", name: "Scale-Space Pyramid Normalization", ms: 118, status: "COMPLETED" as const },
    { id: "03", name: "LoFTR Deep Match + MAGSAC", ms: 240, status: "ACTIVE" as const },
    { id: "04", name: "LOLA Eval + Geotiff Export", ms: 0, status: "QUEUED" as const },
  ],
};

/* ── Photometric lab module ──────────────────────────────────── */
export const PHOTOMETRIC = {
  version: "V4.8-HYBRID",
  models: [
    { id: "01", klass: "EMPIRICAL", name: "LOMMEL-SEELIGER", note: "[ACTIVE BIAS REM]" },
    { id: "02", klass: "EXTENDED", name: "MINNAERT EXP", note: "k = 0.742" },
    { id: "03", klass: "PHYSICAL", name: "HAPKE 5-PARAM", note: "θ: 24.5° ROUGH" },
    { id: "04", klass: "NEURAL", name: "RX BLIND RETINEX", note: "HDR PSR OPT" },
  ],
  phase: "71.6°",
  params: { k: 0.742, theta: 24.5, h: "0.038", omega: "0.124", b: "0.310", c: "0.180" },
  convergence: {
    fidelity: 99.1,
    iterations: "#1,482",
    rmse: "0.042",
    psnrGain: "+12.84",
    horRange: "4.8×",
    ssim: "0.984",
    flux: "89.2%",
    tieYield: "+312",
  },
  occlusion: 62.4,
};

/* ── Elevation module ────────────────────────────────────────── */
export const ELEVATION = {
  gridRef: "SHACKLETON-SOUTH-POLAR-QUAD-01",
  samples: "21,000 PTS [1.0m STEP]",
  hazard: "ELEV-HIGH (31.8°)",
  crater: {
    name: "SHACKLETON CRATER",
    tagline: "Lunar South Pole Impact Basin // Depths Rim",
    center: "89.90° S, 0.00° E",
    diameter: "21.00 KM",
    maxDepth: "-4,280",
    crestRelief: "+1,120",
  },
  demStack: [
    { name: "LOLA Laser Altimeter", meta: "1400 Hz Pulse · 5m Vertical Prec", status: "ONLINE", tone: "gr" as const },
    { name: "TMC-2 Stereo DEM", meta: "5.0 m/px Spatial Res · ISRO CH-2", status: "SYNCED", tone: "cy" as const },
    { name: "ShadowCam / LROC NAC", meta: "0.5 m/px PSR Low-Light Tie", status: "MERGED", tone: "gr" as const },
  ],
  transects: [
    { id: "A-B", name: "TRANSECT A-B: RIM-TO-FLOOR", meta: "ACTIVE", active: true },
    { id: "C-D", name: "TRANSECT C-D: RIDGE SPUR", meta: "14.2 km", active: false },
    { id: "POLY", name: "CUSTOM POLYLINE ROUTE", meta: "UNBOUND", active: false },
  ],
  tint: [
    { elev: "+1,200m", label: "Sunlit Rim Crest", color: "#ffb454" },
    { elev: "+400m", label: "Outer Terraces", color: "#d8a25e" },
    { elev: "-800m", label: "Wall Ingress", color: "#4f9f92" },
    { elev: "-2,000m", label: "Shadow Boundary", color: "#2d6f9e" },
    { elev: "-4,500m", label: "Floor Nadir Void", color: "#143a7e" },
  ],
  stats: {
    totalRelief: "5,400",
    avgWall: "28.6°",
    maxSlope: "34.2°",
    maxSlopeAt: "6.8KM",
    rugosity: "0.142",
  },
  hazards: { maxSlope: 31.8, coldTrap: 42.1 },
  solarPersistence: { rimA: 86.4, floor: 0.0 },
  geotech: [
    { k: "BOULDER ABUNDANCE", v: "0.08", u: "/ 100m²" },
    { k: "REGOLITH COHESION", v: "0.82", u: "kPa" },
    { k: "INTERNAL FRICTION ANGLE", v: "38.5", u: "°" },
    { k: "EST. WATER-ICE", v: "5.6", u: "wt% [SUB-SURF]" },
  ],
};

/* ── Archive module ──────────────────────────────────────────── */
export const ARCHIVE = {
  rf: {
    carrier: "7.165 GHz",
    bandwidth: "45.00 MHz",
    cn0: "66.4",
    phaseNoise: "0.0035 rad",
  },
  channels: [
    { ch: "CH-01", label: "7165.2 MHz UpLink", note: "+18.2 dBm Carrier", color: "#2dd9ec" },
    { ch: "CH-02", label: "9400.5 MHz DownLink QPSK", note: "-104.1 dBm", color: "#46e08f" },
    { ch: "CH-03", label: "DSN Goldstone Doppler Residual", note: "+1.23 Hz", color: "#ffb454" },
  ],
  benchmarks: {
    totalRuns: "1,482",
    last24h: "+40",
    nominal: "99.18%",
    threshold: "98.0%",
    meanRmse: "0.118",
    area: "4.82M",
  },
  cluster: {
    name: "A100-ISRO",
    vram: { used: 21.4, total: 24.0, pct: 89.2 },
    tensor: { pct: 94.6, note: "LoFTR Dense" },
    drift: "+0.0024 ms",
  },
  correlation: {
    axes: ["TMC2", "OHRC", "LOLA", "SHOW"],
    matrix: [
      [1.0, 0.98, 0.91, 0.84],
      [0.98, 1.0, 0.89, 0.78],
      [0.91, 0.89, 1.0, 0.93],
      [0.84, 0.78, 0.93, 1.0],
    ],
  },
  incidents: [
    {
      pass: "PASS-0487",
      tag: "[SOLAR EL 4.2°]",
      title: "SHACKLETON PSR",
      body: "Extreme grazing shadow detected in PSR interior. Photometric Hapke BRDF compensation engaged automatically.",
      severity: "CRIT" as const,
    },
    {
      pass: "PASS-0472",
      tag: "[INCIDENCE 78.4°]",
      title: "NOBLE RIM",
      body: "High incidence angle; tie-point density reduced by 14% on SE crater wall. Switched to dense optical-SAR fusion.",
      severity: "WARN" as const,
    },
    {
      pass: "PASS-0461",
      tag: "[S-B PK SPEC]",
      title: "EPHEMERIS JITTER",
      body: "Drift corrected via LOLA altimeter spline synchronization and orbital state vector revision.",
      severity: "INFO" as const,
    },
  ],
  exports: [
    { icon: "grid", label: "GeoTIFF 32-bit" },
    { icon: "cloud", label: "LAS / .LAS Cloud" },
    { icon: "tensor", label: "HDF5 Tensor" },
    { icon: "netcdf", label: "NetCDF-4 Grid" },
  ],
};

/* ── DEM synthesis module (new console) ──────────────────────── */
export const DEM = {
  mesh: { res: "128×128", cells: "16,384", source: "TMC-2 STEREO + LOLA" },
  stats: { vertices: "16.6K", triangles: "32.5K", precision: "0.5 m/px", cloud: "2.1M PTS" },
  stages: [
    { id: "S1", name: "Depth-Map Fusion", note: "TMC-2 ⇌ LOLA warp", pct: 100 },
    { id: "S2", name: "Mesh Triangulation", note: "Delaunay 2.5D", pct: 100 },
    { id: "S3", name: "Photometric Texture Drape", note: "OHRC overlay", pct: 84 },
    { id: "S4", name: "Void Interpolation (PSR)", note: "ShadowCam prior", pct: 37 },
  ],
};

/* ── Site registry for cross-module targeting ────────────────── */
export const SITES = [
  { id: "shackleton", name: "SHACKLETON", lat: "89.90° S", lon: "000.00° E", note: "S-POLE PSR" },
  { id: "boguslawsky", name: "BOGUSLAWSKY", lat: "72.90° S", lon: "043.20° E", note: "FLOOR FRACTURED" },
  { id: "tycho", name: "TYCHO", lat: "43.31° S", lon: "011.36° W", note: "CENTRAL PEAK" },
  { id: "mare-tranq", name: "MARE TRANQUILLITATIS", lat: "08.50° N", lon: "031.40° E", note: "SEAS" },
];
