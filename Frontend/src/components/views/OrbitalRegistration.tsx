"use client";

/**
 * LUNARMATCH 2.0 — ORBITAL REGISTRATION module (Task 4-a)
 * Pass #0482-S · TMC-2 ⇄ OHRC multi-scale co-registration console, Shackleton rim.
 */

import * as React from "react";
import {
  ArrowDownToLine,
  Box,
  Crosshair,
  Download,
  Layers,
  Mountain,
  Move,
  Orbit,
  Palette,
  RefreshCcw,
  RefreshCw,
  Sun,
} from "lucide-react";
import {
  Panel,
  Lbl,
  Dot,
  Chip,
  KV,
  Stat,
  Btn,
  Seg,
  Tick,
  Bar,
  Code,
  SubHead,
} from "@/components/hud/primitives";
import { Gauge, Ring } from "@/components/hud/Gauge";
import { TransectProfile } from "@/components/hud/charts";
import { IntelFeed } from "@/components/hud/StreamText";
import { ORBITAL } from "@/lib/mission-data";
import { useMission } from "@/lib/mission-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ── local types ────────────────────────────────────────────── */

type ViewMode = "photometric" | "height" | "lola" | "diff" | "cloud";

const VIEW_TABS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "photometric", label: "PHOTOMETRIC", icon: <Sun className="size-3" aria-hidden="true" /> },
  { id: "height", label: "3D HEIGHTFIELD", icon: <Mountain className="size-3" aria-hidden="true" /> },
  { id: "lola", label: "LOLA COLOR", icon: <Palette className="size-3" aria-hidden="true" /> },
  { id: "diff", label: "DIFF MAP", icon: <Layers className="size-3" aria-hidden="true" /> },
  { id: "cloud", label: "POINT CLOUD", icon: <Box className="size-3" aria-hidden="true" /> },
];

const VIEW_FILTERS: Record<ViewMode, string> = {
  photometric: "brightness(1.05) contrast(1.08)",
  height: "brightness(0.84) contrast(1.42) saturate(1.15)",
  lola: "sepia(0.55) hue-rotate(155deg) saturate(2.4) brightness(0.82) contrast(1.12)",
  diff: "grayscale(1) invert(1) brightness(0.88) contrast(1.6)",
  cloud: "grayscale(1) brightness(0.45) contrast(1.25)",
};

/* viewport overlay match-line geometry (viewBox 400×300, stretched) */
const VP_LINES: [number, number, number, number][] = [
  [40, 72, 112, 100],
  [64, 264, 132, 196],
  [88, 144, 132, 164],
  [176, 296, 220, 244],
  [208, 80, 252, 132],
  [280, 320, 340, 252],
  [304, 112, 364, 156],
];

/* deterministic point-cloud scatter (stable across SSR/hydration) */
const CLOUD_PTS = (() => {
  let seed = 482;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 170 }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    r: 0.5 + rnd() * 1.0,
    g: rnd(),
  }));
})();

/* ── crosshair reticle (rotating dashed ring, SMIL = no CSS deps) ── */

function Reticle({ className, label }: { className?: string; label: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute -translate-x-1/2 -translate-y-1/2", className)}
      style={{ width: 92, height: 92 }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 92 92" width="92" height="92" className="overflow-visible" aria-hidden="true">
        <g stroke="#46e08f" strokeWidth="1.3" opacity="0.92">
          <line x1="46" y1="2" x2="46" y2="24" />
          <line x1="46" y1="68" x2="46" y2="90" />
          <line x1="2" y1="46" x2="24" y2="46" />
          <line x1="68" y1="46" x2="90" y2="46" />
        </g>
        <g stroke="#46e08f" strokeWidth="1.2" fill="none" opacity="0.6">
          <path d="M22 34 V22 H34" />
          <path d="M58 22 H70 V34" />
          <path d="M70 58 V70 H58" />
          <path d="M34 70 H22 V58" />
        </g>
        <circle
          cx="46"
          cy="46"
          r="27"
          fill="none"
          stroke="#46e08f"
          strokeWidth="1.1"
          strokeDasharray="5 6"
          opacity="0.8"
        >
          <animateTransform attributeName="transform" type="rotate" from="0 46 46" to="360 46 46" dur="13s" repeatCount="indefinite" />
        </circle>
        <circle cx="46" cy="46" r="2.4" fill="#46e08f" />
      </svg>
    </div>
  );
}

/* ── match vector field (left rail · LoFTR correspondence graph) ── */

const FIELD: { l: [number, number]; r: [number, number]; bow: number; ok: boolean }[] = [
  { l: [26, 14], r: [194, 20], bow: -5, ok: true },
  { l: [26, 36], r: [194, 31], bow: 5, ok: true },
  { l: [26, 58], r: [194, 63], bow: -4, ok: true },
  { l: [26, 80], r: [194, 74], bow: 6, ok: true },
  { l: [26, 102], r: [194, 96], bow: -6, ok: true },
  { l: [26, 47], r: [194, 55], bow: 0, ok: false },
  { l: [26, 91], r: [194, 108], bow: 0, ok: false },
];

function MatchVectorField() {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Lbl className="text-cy/60">REF FRAME [TMC-2]</Lbl>
        <Lbl className="text-gr/60">SRC FRAME [OHRC]</Lbl>
      </div>
      <svg
        viewBox="0 0 220 118"
        width="100%"
        className="hud-inset"
        role="img"
        aria-label="Keypoint match vector field: 5 locked correspondences, 2 rejected outliers"
      >
        {FIELD.map((f, i) => {
          const mx = (f.l[0] + f.r[0]) / 2;
          const my = (f.l[1] + f.r[1]) / 2 + f.bow;
          const d = `M${f.l[0]} ${f.l[1]} Q ${mx} ${my} ${f.r[0]} ${f.r[1]}`;
          return (
            <g key={i}>
              {f.ok ? (
                <path
                  d={d}
                  fill="none"
                  stroke="#46e08f"
                  strokeWidth="1"
                  opacity="0.8"
                  className="match-line"
                />
              ) : (
                <path d={d} fill="none" stroke="#ff5d5d" strokeWidth="0.9" opacity="0.5" strokeDasharray="2 3" />
              )}
              <circle cx={f.l[0]} cy={f.l[1]} r="2.4" fill={f.ok ? "#2dd9ec" : "#ff5d5d"} opacity="0.95" />
              <circle cx={f.r[0]} cy={f.r[1]} r="2.4" fill={f.ok ? "#46e08f" : "#ff5d5d"} opacity="0.95" />
              {!f.ok && (
                <text x={mx} y={my - 3} textAnchor="middle" fontSize="7.5" fill="#ff5d5d" fontWeight="700">
                  ✕
                </text>
              )}
            </g>
          );
        })}
        <line x1="14" y1="4" x2="14" y2="114" stroke="#263342" strokeWidth="1" />
        <line x1="206" y1="4" x2="206" y2="114" stroke="#263342" strokeWidth="1" />
      </svg>
    </div>
  );
}

/* ── mini stat cell (right rail convergence grid) ───────────── */

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "cy" | "gr" | "am";
}) {
  const color = { cy: "text-cy", gr: "text-gr", am: "text-am" }[tone];
  return (
    <div className="hud-inset min-w-0 px-2 py-1.5">
      <Lbl className="block truncate">{label}</Lbl>
      <div className={cn("mono-tabular mt-0.5 text-[13px] font-extrabold leading-tight", color)}>{value}</div>
      <div className="mt-0.5 truncate text-[8px] uppercase tracking-[0.1em] text-faint">{sub}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN VIEW
   ══════════════════════════════════════════════════════════════ */

export default function OrbitalRegistration() {
  const { toast } = useToast();
  const invertSun = useMission((s) => s.invertSun);
  const toggleInvertSun = useMission((s) => s.toggleInvertSun);
  const wireframe = useMission((s) => s.wireframe);

  /* interaction state */
  const [mode, setMode] = React.useState<ViewMode>("photometric");
  const [overlays, setOverlays] = React.useState({ vectors: true, contours: true, psr: false });
  const [refMode, setRefMode] = React.useState<"STEREO" | "NADIR">("STEREO");
  const [strategy, setStrategy] = React.useState(0);
  const [probeX, setProbeX] = React.useState<number | null>(null);
  const [nadirLock, setNadirLock] = React.useState(true);
  const [camMode, setCamMode] = React.useState<"orbit" | "pan" | null>(null);

  /* gauge mount animation */
  const [anim, setAnim] = React.useState(0);
  React.useEffect(() => {
    const t = window.setTimeout(() => setAnim(1), 140);
    return () => window.clearTimeout(t);
  }, []);

  /* VLM intel fetch (memoized, single fetch per mount) */
  const [intel, setIntel] = React.useState<string[]>([]);
  const [intelLoading, setIntelLoading] = React.useState(true);
  const [intelTick, setIntelTick] = React.useState(0);
  const fetchIntel = React.useCallback(async () => {
    setIntelLoading(true);
    try {
      const res = await fetch("/api/mission/vlm-intel?module=orbital");
      const json = (await res.json()) as { lines?: string[] };
      setIntel(json.lines ?? []);
    } catch {
      setIntel([]);
    } finally {
      setIntelLoading(false);
    }
  }, []);
  const fetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchIntel();
  }, [fetchIntel]);

  /* global ⌘K palette refresh */
  React.useEffect(() => {
    const onRefresh = () => void fetchIntel();
    window.addEventListener("lm:refresh-intel", onRefresh);
    return () => window.removeEventListener("lm:refresh-intel", onRefresh);
  }, [fetchIntel]);

  /* derived viewport filter */
  const imgFilter = `${VIEW_FILTERS[mode]}${invertSun ? " invert(1)" : ""}${wireframe ? " grayscale(1)" : ""}`;

  const activeBtn = "text-cy! border-cy/70! bg-cy/10! shadow-[0_0_12px_rgba(45,217,236,0.25)]!";

  return (
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-12" aria-label="Orbital registration module">
      {/* ═══════════════ LEFT RAIL ═══════════════ */}
      <div className="min-w-0 space-y-2 xl:col-span-3">
        {/* 1 — optical sensors */}
        <Panel
          corners
          accent="gr"
          title={
            <>
              <Dot tone="gr" /> OPTICAL SENSORS ACTIVE
            </>
          }
          right={<Chip tone="cy">SYNC: {ORBITAL.sync}</Chip>}
        >
          <div className="space-y-1.5">
            <KV k="FRAME" v={ORBITAL.frame} vClass="text-cy" />
            <KV k="PASS" v={ORBITAL.pass} vClass="text-gr" />
          </div>
        </Panel>

        {/* 2 — dual-sensor multiscale matrix */}
        <Panel
          title="DUAL-SENSOR MULTISCALE MATRIX"
          right={<Chip tone="cy">RATIO {ORBITAL.pyramidRatio} PYRAMID</Chip>}
        >
          <div className="space-y-2">
            {/* Card A — reference */}
            <div className="hud-inset space-y-1.5 p-2">
              <div className="flex items-center justify-between gap-2">
                <Lbl className="text-cy">{ORBITAL.ref.id}</Lbl>
                <div className="flex items-center gap-1" role="group" aria-label="Reference acquisition mode">
                  {(["STEREO", "NADIR"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={refMode === m}
                      onClick={() => setRefMode(m)}
                      className={cn(
                        "hud-chip cursor-pointer px-1.5 py-0.5 text-[8px] transition-colors",
                        refMode === m ? "hud-chip-cy" : "hover:text-ink"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3">
                <KV k="GSD" v={`${ORBITAL.ref.gsd} m/px`} />
                <KV k="ALT" v={`${ORBITAL.ref.alt} km`} />
                <KV k="NADIR" v={ORBITAL.ref.nadir} />
                <KV k="SPEC" v={ORBITAL.ref.spec} />
              </div>
            </div>

            {/* Card B — source */}
            <div className="hud-inset space-y-1.5 p-2">
              <div className="flex items-center justify-between gap-2">
                <Lbl className="text-gr">{ORBITAL.src.id}</Lbl>
                <Chip tone="am" className="text-[8px]">
                  {ORBITAL.src.mode}
                </Chip>
              </div>
              <div className="grid grid-cols-2 gap-x-3">
                <KV k="GSD" v={`${ORBITAL.src.gsd} m/px`} vClass="text-am" />
                <KV k="SOLAR INC" v={ORBITAL.src.solar} />
                <KV k="EXP" v={ORBITAL.src.exp} />
                <KV k="BAND" v={ORBITAL.src.band} />
              </div>
            </div>

            {/* octave depth */}
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Lbl>MULTISCALE OCTAVE DEPTH</Lbl>
                <span className="text-[9px] font-bold tracking-[0.08em] text-cy">{ORBITAL.octaves} LOCKED</span>
              </div>
              <Bar pct={100} tone="cy-gr" segments={12} />
            </div>
          </div>
        </Panel>

        {/* 3 — solar ephemeris gauges */}
        <Panel title="SOLAR EPHEMERIS [SOUTH POLE VECTORS | PSR]">
          <div className="flex items-start justify-between gap-1">
            <Gauge
              value={ORBITAL.solar.elevDeg * anim}
              max={90}
              size={64}
              stroke={4.5}
              tone="cy"
              label="SUN ELEV"
              sub="GRAZING"
              center={
                <span className="mono-tabular text-[11px] font-extrabold text-cy">
                  {(ORBITAL.solar.elevDeg * anim).toFixed(1)}°
                </span>
              }
            />
            <Gauge
              value={ORBITAL.solar.azDeg * anim}
              max={360}
              size={64}
              stroke={4.5}
              tone="am"
              label="SOLAR AZ"
              sub={ORBITAL.solar.azDir}
              center={
                <span className="mono-tabular text-[11px] font-extrabold text-am">
                  {(ORBITAL.solar.azDeg * anim).toFixed(1)}°
                </span>
              }
            />
            <Gauge
              value={ORBITAL.solar.psrRatio * anim}
              max={100}
              size={64}
              stroke={4.5}
              tone="gr"
              label="PSR RATIO"
              sub="SHADOW FACT"
              center={
                <span className="mono-tabular text-[11px] font-extrabold text-gr">
                  {(ORBITAL.solar.psrRatio * anim).toFixed(1)}%
                </span>
              }
            />
          </div>
        </Panel>

        {/* 4 — photometric invariance strategy */}
        <Panel
          title="PHOTOMETRIC INVARIANCE STRATEGY"
          right={<Chip tone="gr">[ACTIVE]</Chip>}
        >
          <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Normalization strategy">
            {ORBITAL.strategies.map((s, i) => (
              <button
                key={s}
                type="button"
                aria-pressed={strategy === i}
                onClick={() => setStrategy(i)}
                className={cn(
                  "hud-chip cursor-pointer transition-all",
                  strategy === i
                    ? "hud-chip-cy shadow-[0_0_10px_rgba(45,217,236,0.28)]"
                    : "hover:text-ink"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <SubHead>NORMALIZATION SOLVER:</SubHead>
          <Code>{ORBITAL.solver}</Code>
        </Panel>

        {/* 5 — match vector field */}
        <Panel title="MATCH VECTOR FIELD" right={<Chip tone="gr">KP {ORBITAL.convergence.inliers}/{ORBITAL.convergence.inliersTotal}</Chip>}>
          <MatchVectorField />
        </Panel>
      </div>

      {/* ═══════════════ CENTER ═══════════════ */}
      <div className="min-w-0 space-y-2 xl:col-span-6">
        {/* toolbar */}
        <div className="space-y-1.5">
          <Seg options={VIEW_TABS} value={mode} onChange={setMode} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <Tick
                label="VECTORS"
                checked={overlays.vectors}
                onChange={(v) => setOverlays((o) => ({ ...o, vectors: v }))}
              />
              <Tick
                label="CONTOURS 50m"
                checked={overlays.contours}
                onChange={(v) => setOverlays((o) => ({ ...o, contours: v }))}
                tone="gr"
              />
              <Tick
                label="PSR MASK"
                checked={overlays.psr}
                onChange={(v) => setOverlays((o) => ({ ...o, psr: v }))}
                tone="am"
              />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Chip tone="cy">ZOOM {ORBITAL.zoom}</Chip>
              <Chip tone="dim">FOV {ORBITAL.fov}</Chip>
              <Chip tone="am">ELEV {ORBITAL.elevFloor}</Chip>
            </div>
          </div>
        </div>

        {/* target viewport */}
        <Panel
          corners
          title={`TARGET: ${ORBITAL.target} ${ORBITAL.targetCoord}`}
          right={
            <Chip tone="cy" dot>
              LIVE REGISTER
            </Chip>
          }
          bodyClass="p-1.5"
        >
          <div
            className="hud-viewport h-[340px] w-full sm:h-[420px] xl:h-[480px]"
            role="img"
            aria-label="Co-registered OHRC optical viewport of Shackleton rim with live match vectors"
          >
            {/* base imagery */}
            <img
              src="/imagery/crater-optical.png"
              alt="Chandrayaan-2 OHRC grayscale optical mosaic of the Shackleton crater rim"
              className="absolute inset-0 h-full w-full object-cover transition-[filter,opacity] duration-300"
              style={{ filter: imgFilter, opacity: wireframe ? 0.5 : 1 }}
              loading="eager"
              fetchPriority="high"
              draggable={false}
            />

            {/* CRT / HUD overlays */}
            <div className="viewport-grid" aria-hidden="true" />
            <div className="viewport-scanline" aria-hidden="true" />
            <div className="viewport-vignette" aria-hidden="true" />
            <div className="viewport-crt" aria-hidden="true" />

            {/* wireframe mesh (F1) */}
            {wireframe && (
              <div
                className="pointer-events-none absolute inset-0 opacity-45"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(70,224,143,0.18) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, rgba(70,224,143,0.18) 0 1px, transparent 1px 26px)",
                }}
              />
            )}

            {/* contour overlay */}
            {overlays.contours && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {[7, 13, 20, 28, 37].map((rx, i) => (
                  <ellipse
                    key={rx}
                    cx="49"
                    cy="57"
                    rx={rx}
                    ry={rx * 0.6}
                    fill="none"
                    stroke="#46e08f"
                    strokeOpacity={0.3 - i * 0.045}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <text x="49" y="96.5" textAnchor="middle" fontSize="1.7" fill="#46e08f" opacity="0.6" letterSpacing="0.3">
                  CONTOUR INT 50 M
                </text>
              </svg>
            )}

            {/* PSR mask hatch */}
            {overlays.psr && (
              <div
                className="pointer-events-none absolute bottom-0 left-[18%] right-[22%] top-[58%] border border-[#5f9bff]/40"
                style={{ background: "repeating-linear-gradient(45deg, rgba(84,140,255,0.16) 0 3px, transparent 3px 9px)" }}
                aria-hidden="true"
              >
                <span className="absolute right-1 top-1 text-[7.5px] font-bold tracking-[0.14em] text-[#7fa8e8]">
                  PSR MASK
                </span>
              </div>
            )}

            {/* point-cloud scatter (POINT CLOUD tab) */}
            {mode === "cloud" && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {CLOUD_PTS.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill={p.g > 0.55 ? "#2dd9ec" : "#46e08f"}
                    opacity={0.35 + p.g * 0.55}
                  />
                ))}
              </svg>
            )}

            {/* match vector overlay */}
            {overlays.vectors && (
              <>
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 400 300"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {VP_LINES.map(([x1, y1, x2, y2], i) => (
                    <g key={i}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#46e08f"
                        strokeWidth="1"
                        opacity="0.75"
                        className="match-line"
                      />
                      <circle cx={x1} cy={y1} r="3" fill="#2dd9ec" opacity="0.9" />
                      <circle cx={x2} cy={y2} r="3" fill="#46e08f" opacity="0.9" />
                    </g>
                  ))}
                  {/* rejected correspondence */}
                  <g stroke="#ff5d5d" strokeWidth="1.6" opacity="0.95">
                    <line x1="180" y1="141" x2="204" y2="165" />
                    <line x1="204" y1="141" x2="180" y2="165" />
                  </g>
                </svg>

                <Reticle className="left-[35%] top-[42%]" label="Target A reticle: Shackleton Peak-1" />
                <Reticle className="left-[62%] top-[58%]" label="Target B reticle: Connecting Ridge Transect" />

                {/* target label boxes */}
                <div className="hud-inset absolute left-[4%] top-[16%] max-w-[46%] px-1.5 py-1 leading-relaxed">
                  <div className="text-[8.5px] font-bold tracking-[0.08em] text-ink">
                    TGT-A: SHACKLETON PEAK-1
                  </div>
                  <div className="text-[8px] tracking-[0.06em] text-dim">
                    RESIDUAL: <span className="text-gr">0.08 px</span> [CONF: <span className="text-cy">99.4%</span>]
                  </div>
                </div>
                <div className="hud-inset absolute bottom-[10%] left-[63%] max-w-[35%] px-1.5 py-1 leading-relaxed">
                  <div className="text-[8.5px] font-bold tracking-[0.08em] text-ink">
                    TGT-B: CONNECTING RIDGE TRANSECT
                  </div>
                  <div className="text-[8px] tracking-[0.06em] text-dim">
                    RESIDUAL: <span className="text-gr">0.11 px</span> [<span className="text-cy">EPIPOLAR LOCK</span>]
                  </div>
                </div>
              </>
            )}

            {/* top-left illumination overlay */}
            <div className="absolute left-2 top-2 max-w-[58%] space-y-0.5">
              <div className="text-[8.5px] font-bold tracking-[0.08em] text-am">
                ☀ SOLAR INCIDENCE VECTOR [AZ {ORBITAL.solar.azDeg.toFixed(1).padStart(5, "0")}° | EL{" "}
                {ORBITAL.solar.elevDeg.toFixed(1)}°]
              </div>
              <div className="text-[8px] tracking-[0.08em] text-dim">
                ILLUMINATION: CHANDRAYAAN-2 L1 CO-REGISTRATION
              </div>
            </div>

            {/* top-right polar grid */}
            <div className="absolute right-2 top-2 max-w-[40%] text-right text-[8.5px] font-bold leading-relaxed tracking-[0.08em] text-cy">
              POLAR GRID: 89.9214° S / LONGITUDE: 000.0412° E
            </div>

            {/* bottom-left scale */}
            <div className="absolute bottom-2 left-2">
              <div className="mb-1 h-[3px] w-16 border-x border-white/90 bg-white/85" aria-hidden="true" />
              <div className="text-[8px] font-bold tracking-[0.1em] text-ink/85">SCALE: 1,000 METERS</div>
            </div>

            {/* bottom-right errors */}
            <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5">
              <span className="text-[8.5px] font-bold tracking-[0.08em] text-rd">ERR: 4.22px [PSR REJECT]</span>
              <span className="text-[8px] font-bold tracking-[0.08em] text-or">CONTOUR CLIP</span>
            </div>
          </div>
        </Panel>

        {/* rim-to-floor transect */}
        <Panel
          title="RIM-TO-FLOOR CROSS-SECTION ELEVATION TRANSECT (TMC-2 STEREO DERIVED)"
          right={<Chip tone="am">MAX GRADIENT: 31.8° AT WALL</Chip>}
        >
          <TransectProfile probeX={probeX} onProbe={setProbeX} height={178} />
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            <div className="hud-inset px-2 py-1.5">
              <div className="mono-tabular text-[13px] font-extrabold text-am text-glow-am">{ORBITAL.elevRim}</div>
              <div className="text-[8px] uppercase tracking-[0.12em] text-faint">RIM CREST</div>
            </div>
            <div className="hud-inset px-2 py-1.5">
              <div className="text-[8px] uppercase tracking-[0.12em] text-faint">SHACKLETON INTERIOR DEEP</div>
              <div className="mono-tabular text-[13px] font-extrabold text-[#5f9bff]">{ORBITAL.elevFloor} <span className="text-[8px] font-bold tracking-[0.1em]">[FLOOR PSR]</span></div>
            </div>
            <div className="hud-inset px-2 py-1.5">
              <div className="text-[8px] uppercase tracking-[0.12em] text-faint">EPIPOLAR BAND</div>
              <div className="mono-tabular text-[13px] font-extrabold text-gr text-glow-gr">NOMINAL</div>
            </div>
          </div>
        </Panel>

        {/* camera controls */}
        <Panel bodyClass="px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Btn
              icon={<Orbit className="size-3.5" aria-hidden="true" />}
              className={camMode === "orbit" ? activeBtn : undefined}
              title="Orbit camera mode"
              onClick={() => setCamMode((m) => (m === "orbit" ? null : "orbit"))}
            >
              ORBIT 3D
            </Btn>
            <Btn
              icon={<Move className="size-3.5" aria-hidden="true" />}
              className={camMode === "pan" ? activeBtn : undefined}
              title="Pan camera mode"
              onClick={() => setCamMode((m) => (m === "pan" ? null : "pan"))}
            >
              PAN
            </Btn>
            <Btn
              icon={<Crosshair className="size-3.5" aria-hidden="true" />}
              onClick={() => {
                setProbeX(null);
                setCamMode(null);
                toast({
                  title: "VIEWPORT RE-CENTERED",
                  description: "Nadir camera re-locked to 89.9214° S · 000.0412° E — Shackleton rim datum.",
                });
              }}
            >
              RE-CENTER
            </Btn>
            <Btn
              icon={<ArrowDownToLine className="size-3.5" aria-hidden="true" />}
              title={nadirLock ? "Nadir lock engaged — click to release" : "Nadir lock released — click to engage"}
              className={nadirLock ? activeBtn : undefined}
              onClick={() => setNadirLock((v) => !v)}
            >
              NADIR LOCK
            </Btn>
            <span className="ml-auto text-[9px] font-bold tracking-[0.12em] text-gr">
              OPENGL 4.6 · CORES: 3840 ACTIVE
            </span>
          </div>
        </Panel>
      </div>

      {/* ═══════════════ RIGHT RAIL ═══════════════ */}
      <div className="min-w-0 space-y-2 xl:col-span-3">
        {/* 1 — convergence telemetry */}
        <Panel title="CONVERGENCE TELEMETRY" right={<Chip tone="cy">USAC-MAGSAC</Chip>}>
          <div className="flex items-center gap-3">
            <Stat
              className="flex-1"
              label="POINT CONVERGENCE"
              value={`${ORBITAL.convergence.pct}%`}
              sub="HOMOGRAPHY H₃ₓ₃ LOCK"
              tone="cy"
              size="xl"
            />
            <Ring pct={ORBITAL.convergence.pct * anim} size={64} stroke={4} tone="gr">
              <span className="mono-tabular text-[9.5px] font-bold text-gr">
                {Math.round(ORBITAL.convergence.pct * anim)}
              </span>
            </Ring>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <MiniStat
              label="INLIERS COUNT"
              value={`${ORBITAL.convergence.inliers}/${ORBITAL.convergence.inliersTotal}`}
              sub="98.9% Ratio"
              tone="gr"
            />
            <MiniStat label="CONVERGED RMSE" value={`${ORBITAL.convergence.rmse} px`} sub="Sub-pixel limit" tone="cy" />
            <MiniStat label="PEAK PSNR GAIN" value={`${ORBITAL.convergence.psnr} dB`} sub="Multi-illum" tone="gr" />
            <MiniStat label="SSIM SCORE" value={ORBITAL.convergence.ssim} sub="Structure sim" tone="cy" />
            <MiniStat label="RESIDUAL MEDIAN" value={`${ORBITAL.convergence.residual} px`} sub="L1-Norm" tone="am" />
            <MiniStat label="EPIPOLAR ERROR" value={ORBITAL.convergence.epipolar} sub="Orbital collinear" tone="gr" />
          </div>
        </Panel>

        {/* 2 — VLM intel feed */}
        <Panel
          title="LUNAR-GEOAI V4.1 (VLM INTEL)"
          right={
            <>
              <Chip tone="gr" dot>
                STREAMING
              </Chip>
              <Btn
                variant="ghost"
                icon={
                  <RefreshCw className={cn("size-3", intelLoading && "animate-spin")} aria-hidden="true" />
                }
                onClick={() => {
                  setIntelTick((t) => t + 1);
                  void fetchIntel();
                }}
                disabled={intelLoading}
                className="px-1.5"
                title="REFRESH INTEL"
              >
                <span className="sr-only">Refresh intel feed</span>
              </Btn>
            </>
          }
        >
          <div className="max-h-[230px] overflow-y-auto pr-1" aria-live="polite">
            {intelLoading ? (
              <div className="space-y-2.5 py-1" aria-label="Intel feed loading">
                {[64, 92, 78].map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-[10.5px] font-bold text-gr">&gt;</span>
                    <span className="h-2 animate-pulse rounded-sm bg-raise2" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            ) : (
              <IntelFeed key={intelTick} lines={intel} />
            )}
          </div>
        </Panel>

        {/* 3 — pipeline stages */}
        <Panel title="PIPELINE EXECUTION STAGES" right={<Chip tone="am">3/4</Chip>}>
          <div className="space-y-1.5">
            {ORBITAL.pipeline.map((p) => {
              const tone = p.status === "COMPLETED" ? "gr" : p.status === "ACTIVE" ? "cy" : "dim";
              return (
                <div
                  key={p.id}
                  className={cn(
                    "hud-inset relative flex items-center gap-2 overflow-hidden px-2 py-1.5",
                    p.status === "ACTIVE" && "border-cy/40"
                  )}
                >
                  {p.status === "ACTIVE" && (
                    <span
                      aria-hidden="true"
                      className="animate-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-cy/10 to-transparent"
                    />
                  )}
                  <span className="w-5 shrink-0 text-[10px] font-extrabold text-cy">{p.id}</span>
                  <span className="min-w-0 flex-1 truncate text-[9.5px] font-bold tracking-[0.04em] text-ink/90">
                    {p.name}
                  </span>
                  <Chip tone="dim" className="text-[8px]">
                    {p.ms}MS
                  </Chip>
                  <Chip tone={tone} dot={p.status === "ACTIVE"} className="text-[8px]">
                    {p.status}
                  </Chip>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* 4 — actions */}
        <div className="space-y-1.5">
          <Btn
            variant="accent"
            full
            icon={<Mountain className="size-3.5" aria-hidden="true" />}
            onClick={() =>
              toast({
                title: "DEM SYNTHESIS QUEUED",
                description:
                  "Pass #0482-S heightfield fusion started — GeoTIFF export follows pipeline stage 04 completion.",
              })
            }
          >
            EXECUTE 3D DEM SYNTHESIS &amp; EXPORT GEOTIFF
          </Btn>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn
              icon={<RefreshCcw className="size-3.5" aria-hidden="true" />}
              onClick={() =>
                toast({
                  title: "MAGSAC RE-RUN",
                  description:
                    "USAC-MAGSAC++ consensus re-estimation over 3894 candidates — expect ΔRMSE ≤ 0.02 px.",
                })
              }
            >
              RE-RUN MAGSAC
            </Btn>
            <Btn
              icon={<Sun className="size-3.5" aria-hidden="true" />}
              onClick={() => {
                toggleInvertSun();
                toast({
                  title: invertSun ? "SUN VECTOR RESTORED" : "SUN VECTOR INVERTED",
                  description: invertSun
                    ? "Photometric illumination model returned to grazing-forward configuration."
                    : "Relief-invariant shading inversion engaged — PSR interior features enhanced.",
                });
              }}
            >
              INVERT SUN VECTOR
            </Btn>
          </div>
          <Btn
            full
            icon={<Download className="size-3.5" aria-hidden="true" />}
            onClick={() => {
              window.open("/api/mission/export/pds4", "_blank");
              useMission.getState().enqueueProduct("POINTCLOUD_SHACKLETON", "LAS", 210.4);
              toast({
                title: "PDS4 EXPORT STREAMING",
                description: "Point cloud bundle (.LAS 1.4) + PDS4 label queued to downlink.",
              });
            }}
          >
            DOWNLOAD POINT CLOUD (.LAS 1.4)
          </Btn>
        </div>
      </div>
    </div>
  );
}
