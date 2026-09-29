"use client";

/**
 * LUNARMATCH 2.0 — PHOTOMETRIC LAB view (Task 4-b)
 * Dark mission-console module: formulation selector, regolith scattering
 * params (store-driven), ephemeris illumination gauges, split-comparison
 * viewport with store-reactive CSS filters, transect profile + convergence rail.
 */
import * as React from "react";
import Image from "next/image";
import {
  Calculator,
  CircleDashed,
  Columns2,
  Flame,
  Layers,
  Moon,
  RefreshCw,
  Undo2,
} from "lucide-react";
import {
  Bar,
  Btn,
  Chip,
  Code,
  KV,
  Lbl,
  Panel,
  Seg,
  Stat,
  SubHead,
} from "@/components/hud/primitives";
import { Gauge } from "@/components/hud/Gauge";
import { Histogram } from "@/components/hud/charts";
import { IntelFeed } from "@/components/hud/StreamText";
import { PHOTOMETRIC } from "@/lib/mission-data";
import { useMission } from "@/lib/mission-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { IirsSpectral } from "@/components/views/photometric/IirsSpectral";

/* ── viewport modes ─────────────────────────────────────────── */
type ViewMode = "SPLIT" | "HEATMAP" | "MASK" | "CONTOUR";

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "SPLIT", label: "SPLIT COMPARISON", icon: <Columns2 className="size-3" /> },
  { id: "HEATMAP", label: "RESIDUAL HEATMAP", icon: <Flame className="size-3" /> },
  { id: "MASK", label: "SHADOW MASK (PSR)", icon: <Moon className="size-3" /> },
  { id: "CONTOUR", label: "CONTOURS (5°-15°)", icon: <CircleDashed className="size-3" /> },
];

/* top-left overlay label per mode */
const MODE_LABEL: Record<ViewMode, { head: string; dot: string; l2: string; l3: string }> = {
  SPLIT: {
    head: "CH2-OHRC SATELLITE OPTICAL",
    dot: "text-am",
    l2: "RAW OPTICAL · 0.25 m/px",
    l3: "NATIVE I_OBS UNNORMALIZED",
  },
  HEATMAP: {
    head: "RESIDUAL FIELD ΔI/F",
    dot: "text-rd",
    l2: "RAW − RECON DIFFERENCE",
    l3: "SATURATION CLAMP ±0.05 I/F",
  },
  MASK: {
    head: "SHADOW MASK (PSR)",
    dot: "text-cy",
    l2: "62.4% OCCLUSION GEOMETRY",
    l3: "DEEP VOID BINNED < 0.02 I/F",
  },
  CONTOUR: {
    head: "CONTOUR OVERLAY (5°-15°)",
    dot: "text-cy",
    l2: "EQUAL-INCIDENCE ISO-RINGS",
    l3: "CYAN DASHED · 10-RING SET",
  },
};

/* subtle per-model grade on the RAW (left) frame — model switch is visible */
const RAW_TONE: Record<string, string> = {
  "LOMMEL-SEELIGER": "brightness(0.96) sepia(0.14) contrast(1.05)",
  "MINNAERT EXP": "brightness(1.03) sepia(0.05) contrast(1.01)",
  "HAPKE 5-PARAM": "brightness(0.90) sepia(0.20) contrast(1.09)",
  "RX BLIND RETINEX": "brightness(1.07) sepia(0.02) contrast(0.98)",
};

/* deterministic residual patches (HEATMAP mode) */
const PATCHES: { left: string; top: string; w: number; h: number; c: string }[] = [
  { left: "15%", top: "24%", w: 92, h: 48, c: "255,93,93" },
  { left: "52%", top: "42%", w: 128, h: 64, c: "70,224,143" },
  { left: "35%", top: "60%", w: 78, h: 40, c: "255,138,76" },
  { left: "68%", top: "20%", w: 64, h: 44, c: "255,93,93" },
  { left: "23%", top: "58%", w: 60, h: 34, c: "70,224,143" },
];

/* deterministic pseudo-gaussian 16-bin error distribution, peak @ index 8 */
const ERR_BINS: number[] = Array.from({ length: 16 }, (_, i) => {
  const g = Math.exp(-((i - 7.5) ** 2) / 21.5);
  const j = 0.9 + 0.16 * Math.abs(Math.sin(i * 7.13 + 1.7));
  return g * j;
});
const errTone = (i: number) => (i >= 5 && i <= 10 ? (i % 2 === 0 ? "#2dd9ec" : "#46e08f") : "#33475c");

/* ── radiance transect geometry (deterministic, module-scope) ── */
const TR = (() => {
  const W = 560;
  const H = 168;
  const pl = 30;
  const pr = 10;
  const tp = 18;
  const bp = 20;
  const vMax = 0.32;
  const px = (t: number) => pl + t * (W - pl - pr);
  const py = (v: number) => tp + (1 - v / vMax) * (H - tp - bp);
  const line = (fn: (t: number) => number, n = 72) => {
    let d = "";
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      d += `${i === 0 ? "M" : "L"}${px(t).toFixed(1)},${py(Math.max(0.012, fn(t))).toFixed(1)}`;
    }
    return d;
  };
  const raw = line((t) =>
    0.155 +
    0.042 * Math.sin(9.1 * t + 0.4) +
    0.028 * Math.sin(21.7 * t + 1.9) +
    0.02 * Math.sin(38.3 * t + 0.7) +
    0.012 * Math.sin(61 * t + 2.2) -
    0.055 * Math.exp(-((t - 0.63) ** 2) / 0.0045),
  );
  const cor = line(
    (t) => 0.138 + 0.015 * Math.sin(3.7 * t + 1.1) + 0.006 * Math.sin(11.3 * t + 0.5),
  );
  const grid = [0.1, 0.2, 0.3].map((v) => ({ v, y: py(v) }));
  return {
    W,
    H,
    raw,
    cor,
    grid,
    px,
    py,
    psrX0: px(0.55),
    psrX1: px(0.72),
    baseY: py(0),
  };
})();

/* local SVG — RADIANCE TRANSECT PROFILE A-A' */
function TransectChart() {
  return (
    <svg
      viewBox={`0 0 ${TR.W} ${TR.H}`}
      className="h-[150px] w-full sm:h-[168px]"
      preserveAspectRatio="none"
      role="img"
      aria-label="Radiance transect profile A-A prime: raw solar I obs versus corrected albedo"
    >
      {/* PSR band */}
      <rect x={TR.psrX0} y={8} width={TR.psrX1 - TR.psrX0} height={TR.H - 22} fill="rgba(84,140,255,0.10)" />
      <text x={(TR.psrX0 + TR.psrX1) / 2} y={TR.H - 7} fontSize="7" fill="#7fa8e8" textAnchor="middle" letterSpacing="1.5">
        PSR
      </text>

      {/* horizontal grid + labels */}
      {TR.grid.map((g) => (
        <g key={g.v}>
          <line x1={26} x2={TR.W - 8} y1={g.y} y2={g.y} stroke="#1a2531" strokeWidth="1" strokeDasharray="2 4" />
          <text x={22} y={g.y + 2.5} fontSize="7" fill="#4a5a6c" textAnchor="end">
            {g.v.toFixed(2)}
          </text>
        </g>
      ))}
      {/* baseline */}
      <line x1={26} x2={TR.W - 8} y1={TR.baseY} y2={TR.baseY} stroke="#263342" strokeWidth="1" />
      <text x={22} y={TR.baseY + 2.5} fontSize="7" fill="#4a5a6c" textAnchor="end">
        0.00
      </text>

      {/* raw solar I_obs — wobbly, uneven */}
      <path d={TR.raw} fill="none" stroke="#ff8a4c" strokeWidth="1.3" strokeDasharray="5 4" style={{ filter: "drop-shadow(0 0 4px rgba(255,138,76,0.45))" }} />
      {/* corrected albedo — smooth */}
      <path d={TR.cor} fill="none" stroke="#2dd9ec" strokeWidth="1.8" style={{ filter: "drop-shadow(0 0 5px rgba(45,217,236,0.6))" }} />

      {/* transect endpoints */}
      <text x={30} y={13} fontSize="8.5" fontWeight="700" fill="#ffb454">A</text>
      <text x={TR.W - 12} y={13} fontSize="8.5" fontWeight="700" fill="#ffb454" textAnchor="end">A′</text>
    </svg>
  );
}

/* local SVG — concentric iso-incidence contour rings (CONTOUR mode) */
function ContoursOverlay() {
  const rings = [0.14, 0.26, 0.38, 0.5, 0.62, 0.74];
  const labels = ["+800m", "+400m", "0m", "−1.2K", "−2.4K", "−3.6K"];
  return (
    <svg className="pointer-events-none absolute inset-0 z-[6] h-full w-full" viewBox="0 0 800 380" preserveAspectRatio="none" aria-hidden="true">
      {rings.map((rx, i) => {
        const ry = rx * 0.58;
        return (
          <g key={i}>
            <ellipse
              cx={400}
              cy={214}
              rx={rx * 800}
              ry={ry * 380}
              fill="none"
              stroke="#2dd9ec"
              strokeOpacity={0.28 + i * 0.08}
              strokeWidth={1}
              strokeDasharray="4 6"
              className={i % 2 === 0 ? "match-line" : undefined}
            />
            <text x={400} y={214 - ry * 380 - 4} fontSize="7.5" fill="#2dd9ec" fillOpacity="0.75" textAnchor="middle" letterSpacing="1">
              {labels[i]}
            </text>
          </g>
        );
      })}
      {/* nadir cross */}
      <path d="M394 214h12M400 208v12" stroke="#2dd9ec" strokeWidth="1.2" strokeOpacity="0.9" />
      <text x={406} y={222} fontSize="7.5" fill="#7fa8e8" letterSpacing="1">
        NADIR −4,280m
      </text>
    </svg>
  );
}

/* ── store-bound regolith parameter slider row ───────────────── */
function ParamSlider({
  label,
  display,
  ariaLabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  display: string;
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <Lbl>{label}</Lbl>
        <span className="text-[12px] font-extrabold mono-tabular text-ink">{display}</span>
      </div>
      <input
        type="range"
        className="hud-slider"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ "--fill": `${pct.toFixed(1)}%` } as React.CSSProperties}
      />
      <Bar pct={pct} tone="cy" />
    </div>
  );
}

/* ── VLM intel fallback (matches server grounding) ───────────── */
const FALLBACK_INTEL = [
  "Lommel-Seeliger norm eliminated 89.2% of solar azimuth bias across connecting ridge transect.",
  "Hapke shadow fill boosted feature extraction yield by +312 candidates in deep PSR bowl.",
  "Confidence score for 3D DEM stereoscopic bundle: 99.4%. Ready for photometric export.",
];

/* ═══════════════════════════════════════════════════════════════
   PHOTOMETRIC LAB — main view
   ═══════════════════════════════════════════════════════════════ */
export default function PhotometricLab() {
  const { toast } = useToast();
  const photoK = useMission((s) => s.photoK);
  const photoTheta = useMission((s) => s.photoTheta);
  const photoModel = useMission((s) => s.photoModel);
  const setPhoto = useMission((s) => s.setPhoto);

  const [mode, setMode] = React.useState<ViewMode>("SPLIT");
  const [split, setSplit] = React.useState(50);
  const [intel, setIntel] = React.useState<string[]>([]);
  const [intelLoading, setIntelLoading] = React.useState(true);
  const [feedTick, setFeedTick] = React.useState(0);
  const vpRef = React.useRef<HTMLDivElement | null>(null);

  /* VLM intel feed */
  const loadIntel = React.useCallback(async () => {
    setIntelLoading(true);
    try {
      const r = await fetch("/api/mission/vlm-intel?module=photometric");
      const j = (await r.json()) as { lines?: string[] };
      setIntel(Array.isArray(j.lines) && j.lines.length > 0 ? j.lines : FALLBACK_INTEL);
    } catch {
      setIntel(FALLBACK_INTEL);
    } finally {
      setIntelLoading(false);
      setFeedTick((t) => t + 1);
    }
  }, []);
  React.useEffect(() => {
    void loadIntel();
  }, [loadIntel]);

  /* global ⌘K palette refresh */
  React.useEffect(() => {
    const onRefresh = () => void loadIntel();
    window.addEventListener("lm:refresh-intel", onRefresh);
    return () => window.removeEventListener("lm:refresh-intel", onRefresh);
  }, [loadIntel]);

  /* store-driven CSS filters — sliders visibly drive the reconstruction */
  const reconFilter = `saturate(${(0.6 + photoK).toFixed(3)}) hue-rotate(${((photoTheta - 24.5) * 0.8).toFixed(2)}deg) contrast(1.06)`;
  const rawFilter = RAW_TONE[photoModel] ?? "grayscale(1) brightness(0.95)";

  const modeFilter =
    mode === "HEATMAP"
      ? "saturate(0) invert hue-rotate(180deg) contrast(1.12)"
      : mode === "MASK"
        ? "grayscale(1) contrast(1.15) brightness(0.85)"
        : "grayscale(1) contrast(1.08) brightness(0.95)";

  /* split-divider drag */
  const updateFromClientX = (clientX: number) => {
    const el = vpRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(92, Math.max(8, pct)));
  };
  const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.buttons === 0) return;
    updateFromClientX(e.clientX);
  };
  const onHandleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowLeft") {
      setSplit((s) => Math.max(8, s - 2));
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      setSplit((s) => Math.min(92, s + 2));
      e.preventDefault();
    }
  };

  /* actions */
  const handleApply = () =>
    toast({
      title: "CORRECTION APPLIED — EXPORT QUEUED",
      description: "Multi-band GeoTIFF (4.8× HDR · 99.1% fidelity) staged for DSN Goldstone downlink.",
    });
  const handleRecalc = () =>
    toast({
      title: "RESIDUAL SOLVER RE-ENGAGED",
      description: "Recomputing ΔI/F across 64 bins · iteration #1,482 checkpointed · RMSE target 0.042 I/F.",
    });
  const handleReset = () => {
    setPhoto({ photoK: PHOTOMETRIC.params.k, photoTheta: PHOTOMETRIC.params.theta, photoModel: PHOTOMETRIC.models[0].name });
    toast({
      title: "RAW CALIBRATION RESTORED",
      description: "k=0.742 · θ=24.5° · LOMMEL-SEELIGER — viewport reset to native I_obs.",
    });
  };

  const c = PHOTOMETRIC.convergence;
  const modeLabel = MODE_LABEL[mode];

  return (
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
      {/* ══ LEFT RAIL ═════════════════════════════════════════ */}
      <div className="min-w-0 space-y-2 xl:col-span-3">
        {/* 1 — formulation */}
        <Panel title="PHOTOMETRIC FORMULATION" right={<Chip tone="cy">V4.8-HYBRID</Chip>} corners>
          <div className="grid grid-cols-2 gap-1.5">
            {PHOTOMETRIC.models.map((m) => {
              const active = photoModel === m.name;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPhoto({ photoModel: m.name })}
                  className={cn(
                    "hud-inset p-2 text-left transition-all duration-150",
                    active
                      ? "border-cy/70 bg-[rgba(45,217,236,0.06)] shadow-[0_0_16px_rgba(45,217,236,0.18)]"
                      : "hover:border-line2 hover:bg-raise",
                  )}
                >
                  <Lbl className="block">
                    {m.id} / {m.klass}
                  </Lbl>
                  <div className={cn("mt-0.5 text-[10.5px] font-extrabold tracking-wide", active ? "text-cy text-glow-cy" : "text-ink")}>
                    {m.name}
                  </div>
                  <div className={cn("mt-0.5 text-[8.5px] tracking-[0.06em]", active ? "text-gr" : "text-faint")}>{m.note}</div>
                </button>
              );
            })}
          </div>

          <SubHead className="mt-3">EQUATION CORE: EQUAL-AREA PHASE DERIVATIVE</SubHead>
          <Code>
            R<sub>norm</sub> = I<sub>obs</sub> · [ (cos i₀ + cos e) / (R<sub>LS</sub>(i,e)) ]<sup className="text-am">k</sup>
          </Code>
          <div className="mt-1.5 flex justify-between">
            <Lbl>LS-RATIO NORMALIZER</Lbl>
            <Lbl className="text-gr">SINGLE-SCATTER LOCKED</Lbl>
          </div>
        </Panel>

        {/* 2 — regolith scattering params */}
        <Panel title="REGOLITH SCATTERING PARAMETERS" right={<Chip tone="gr">COHERENT I/F</Chip>}>
          <div className="space-y-3">
            <ParamSlider
              label="MINNAERT EXPONENT (k)"
              display={photoK.toFixed(3)}
              ariaLabel="Minnaert exponent k"
              min={0.3}
              max={1.2}
              step={0.001}
              value={photoK}
              onChange={(v) => setPhoto({ photoK: v })}
            />
            <ParamSlider
              label="HAPKE ROUGHNESS ANGLE (θ)"
              display={`${photoTheta.toFixed(1)}°`}
              ariaLabel="Hapke roughness angle theta"
              min={0}
              max={60}
              step={0.1}
              value={photoTheta}
              onChange={(v) => setPhoto({ photoTheta: v })}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {[
              { l: "SURGE WIDTH (h)", v: "0.038", s: "+0.002 NOM", cls: "text-gr" },
              { l: "SCATTER ALBEDO (ω)", v: "0.124", s: "ILMENITE RICH", cls: "text-am" },
              { l: "ANISOTROPY (b)", v: "0.310", s: "ASYM H-G", cls: "text-dim" },
              { l: "FORWARD COEFF (c)", v: "0.180", s: "DIFFUSE LOCK", cls: "text-gr" },
            ].map((p) => (
              <div key={p.l} className="hud-inset p-2">
                <Lbl className="block leading-tight">{p.l}</Lbl>
                <div className={cn("mt-0.5 text-[13px] font-extrabold mono-tabular", p.cls)}>{p.v}</div>
                <div className="mt-0.5 text-[8px] uppercase tracking-[0.1em] text-faint">{p.s}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* 3 — ephemeris illumination vector */}
        <Panel title="EPHEMERIS ILLUMINATION VECTOR" right={<Chip>SHACKLETON 89.9°S</Chip>}>
          <div className="flex items-start justify-around gap-2 py-1">
            <Gauge
              value={18.4}
              max={90}
              size={80}
              stroke={5}
              tone="am"
              label="SUN ELEV"
              sub="GRAZING GRAZED"
              center={<span className="text-[14px] font-extrabold mono-tabular text-am text-glow-am">18.4°</span>}
            />
            <Gauge
              value={45.2}
              max={360}
              size={80}
              stroke={5}
              tone="cy"
              label="AZIMUTH"
              sub="NE VECTOR"
              center={<span className="text-[14px] font-extrabold mono-tabular text-cy text-glow-cy">45.2°</span>}
            />
          </div>
        </Panel>

        {/* 4 — occlusion ratio */}
        <Panel title="OCCLUSION RATIO" right={<Chip tone="am" dot>POLAR PSR TRIGGER</Chip>} accent="am">
          <KV k="SHACKLETON FLOOR — SOLAR INTERCEPT" v="62.4%" vClass="text-am" />
          <div className="relative mt-2">
            <Bar pct={PHOTOMETRIC.occlusion} tone="am" />
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2px]">
              <div
                className="absolute inset-y-0 w-1/3 animate-sweep"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,180,84,0.4), transparent)" }}
              />
            </div>
          </div>
          <div className="mt-1.5 flex justify-between">
            <Lbl>LIT</Lbl>
            <Lbl>TERMINATOR</Lbl>
            <Lbl className="text-am">PSR VOID</Lbl>
          </div>
        </Panel>
      </div>

      {/* ══ CENTER ═════════════════════════════════════════════ */}
      <div className="min-w-0 space-y-2 xl:col-span-6">
        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Seg options={VIEW_MODES} value={mode} onChange={setMode} />
          <div className="flex items-center gap-1.5">
            <Chip tone="cy">PHASE g: {PHOTOMETRIC.phase}</Chip>
            <Chip tone="gr">LOLA SYNC OK</Chip>
          </div>
        </div>

        {/* split viewport — the centerpiece */}
        <div ref={vpRef} className="hud-viewport corners h-[380px] select-none">
          <span className="corner-b" aria-hidden="true" />

          {/* imagery layer */}
          {mode === "SPLIT" ? (
            <>
              <Image
                src="/imagery/crater-optical.png"
                alt="Raw grayscale CH2-OHRC optical frame of Shackleton crater with deep shadows"
                fill
                priority
                draggable={false}
                sizes="(max-width: 1279px) 100vw, 45vw"
                className="object-cover"
                style={{ clipPath: `inset(0 ${100 - split}% 0 0)`, filter: rawFilter, transition: "filter 160ms ease" }}
              />
              <Image
                src="/imagery/crater-recon.png"
                alt="False-color photometric radiance reconstruction of Shackleton crater"
                fill
                priority
                draggable={false}
                sizes="(max-width: 1279px) 100vw, 45vw"
                className="object-cover"
                style={{ clipPath: `inset(0 0 0 ${split}%)`, filter: reconFilter, transition: "filter 160ms ease" }}
              />
            </>
          ) : (
            <Image
              src="/imagery/crater-recon.png"
              alt="False-color photometric radiance reconstruction with analysis overlay"
              fill
              priority
              draggable={false}
              sizes="(max-width: 1279px) 100vw, 50vw"
              className="object-cover"
              style={{ filter: modeFilter, transition: "filter 160ms ease" }}
            />
          )}

          {/* mode-specific overlays */}
          {mode === "HEATMAP" &&
            PATCHES.map((p, i) => (
              <div
                key={i}
                className="pointer-events-none absolute z-[5] rounded-full mix-blend-screen blur-[6px]"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.w,
                  height: p.h,
                  background: `radial-gradient(ellipse at center, rgba(${p.c},0.55), transparent 70%)`,
                }}
              />
            ))}
          {mode === "MASK" && (
            <>
              <div
                className="pointer-events-none absolute inset-0 z-[5]"
                style={{
                  background:
                    "radial-gradient(58% 52% at 50% 56%, rgba(16,32,84,0.5) 0%, rgba(6,12,34,0.8) 55%, rgba(2,4,12,0.95) 100%)",
                }}
              />
              <div
                className="pointer-events-none absolute z-[5] rounded-[50%] border border-dashed border-[#548cff]/70"
                style={{ left: "27%", top: "37%", width: "46%", height: "38%", boxShadow: "inset 0 0 18px rgba(84,140,255,0.25)" }}
              />
              <div className="absolute left-1/2 top-[77%] z-[6] -translate-x-1/2">
                <Chip tone="cy">PSR CORE — 62.4% VOID</Chip>
              </div>
            </>
          )}
          {mode === "CONTOUR" && <ContoursOverlay />}

          {/* split divider + draggable handle */}
          {mode === "SPLIT" && (
            <div
              className="absolute inset-y-0 z-[15] w-[2px] bg-cy"
              style={{ left: `${split}%`, boxShadow: "0 0 12px rgba(45,217,236,0.8)" }}
              aria-hidden="true"
            >
              <button
                type="button"
                role="slider"
                aria-label="Split comparison position"
                aria-valuemin={8}
                aria-valuemax={92}
                aria-valuenow={Math.round(split)}
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
                onPointerCancel={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
                onKeyDown={onHandleKey}
                className="absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-cy bg-void/85 text-[8px] font-bold text-cy backdrop-blur-sm"
                style={{ boxShadow: "0 0 14px rgba(45,217,236,0.7)" }}
              >
                ◂▸
              </button>
            </div>
          )}

          {/* viewport furniture */}
          <div className="viewport-grid" aria-hidden="true" />
          <div className="viewport-vignette" aria-hidden="true" />
          <div className="viewport-crt" aria-hidden="true" />
          <div className="viewport-scanline" aria-hidden="true" />

          {/* top-left overlay label */}
          <div className="hud-inset absolute left-2 top-2 z-10 max-w-[47%] bg-void/70 px-2 py-1.5 backdrop-blur-[2px]">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-[9px]", modeLabel.dot)}>◉</span>
              <span className="text-[9px] font-extrabold tracking-[0.1em] text-ink">{modeLabel.head}</span>
            </div>
            <div className="mt-0.5 text-[8px] font-bold tracking-[0.08em] text-dim">{modeLabel.l2}</div>
            <div className="text-[7.5px] tracking-[0.08em] text-faint">{modeLabel.l3}</div>
          </div>

          {/* top-right overlay label */}
          <div className="hud-inset absolute right-2 top-2 z-10 max-w-[47%] bg-void/70 px-2 py-1.5 text-right backdrop-blur-[2px]">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[9px] text-gr">◉</span>
              <span className="text-[9px] font-extrabold tracking-[0.1em] text-ink">PHOTOMETRIC RADIANCE RECON</span>
            </div>
            <div className="mt-0.5 text-[8px] font-bold tracking-[0.08em] text-dim">HAPKE + LOMMEL SEELIGER</div>
            <div className="text-[7.5px] tracking-[0.08em] text-faint">INCIDENCE ANGLE BIAS REMOVED</div>
          </div>

          {/* floating callouts */}
          {mode === "SPLIT" && (
            <>
              <div className="hud-inset absolute left-[30%] top-[35%] z-10 hidden max-w-[220px] border-l-2 border-l-am bg-void/80 px-2 py-1.5 backdrop-blur-[2px] md:block">
                <div className="text-[9px] font-extrabold tracking-[0.08em] text-ink">RIM-PEAK A ELEV: 4120m</div>
                <div className="text-[7.5px] tracking-[0.1em] text-faint">GLARE NORMALIZED (−18.6%)</div>
              </div>
              <div className="hud-inset absolute left-[35%] top-[55%] z-10 hidden max-w-[240px] border-l-2 border-l-cy bg-void/80 px-2 py-1.5 backdrop-blur-[2px] md:block">
                <div className="text-[9px] font-extrabold tracking-[0.08em] text-ink">PSR-ZONE 1 (SHACKLETON FLOOR)</div>
                <div className="text-[7.5px] tracking-[0.1em] text-cy/90">DEEP SHADOW RESTORED (+34.2 dB)</div>
              </div>
            </>
          )}

          {/* coordinates */}
          <div className="absolute bottom-[66px] left-2.5 z-10 text-[8.5px] font-bold tracking-[0.14em] text-cy/85">
            LAT: 89.89°S | LON: 0.04°E | FOV: 12.4 KM²
          </div>

          {/* gradient legend */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-void/95 via-void/70 to-transparent px-2.5 pb-1.5 pt-5">
            <div className="mb-0.5 flex justify-between text-[7.5px] font-bold tracking-[0.08em] text-faint">
              <span>0.00 I/F (VOID)</span>
              <span className="hidden sm:inline">0.07 I/F</span>
              <span className="hidden sm:inline">0.14 I/F</span>
              <span>0.21 I/F</span>
              <span>0.28 I/F (PEAK)</span>
            </div>
            <div
              className="h-[7px] w-full rounded-[1px] border border-line"
              style={{
                background: "linear-gradient(90deg,#020409 0%,#0b3a46 22%,#0e7490 45%,#46e08f 70%,#c8d96a 85%,#ffb454 100%)",
              }}
            />
            <div className="mt-0.5 flex justify-between text-[7px] tracking-[0.18em] text-faint">
              <span>ZERO-FLUX</span>
              <span>GRAZING</span>
              <span>INLIER</span>
              <span>SATURATED</span>
            </div>
          </div>
        </div>

        {/* transect profile */}
        <Panel title="RADIANCE TRANSECT PROFILE A-A'" right={<Chip>TRANSECT LENGTH: 8.42 KM</Chip>} corners accent="cy">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Chip tone="dim">
              <span className="inline-block w-3.5 border-t-2 border-dashed border-or" aria-hidden="true" />
              RAW SOLAR I_OBS (UNEVEN ILLUMINATION)
            </Chip>
            <Chip tone="dim">
              <span className="inline-block w-3.5 border-t-2 border-cy" aria-hidden="true" />
              CORRECTED ALBEDO PROFILE (TRUE REGOLITH)
            </Chip>
            <Chip tone="gr" className="ml-auto">
              RESIDUAL DEVIATION ±0.008
            </Chip>
          </div>
          <TransectChart />
          <div className="mt-1 flex justify-between">
            <Lbl>0.0 KM — RIM CREST A</Lbl>
            <Lbl>I/F RADIANCE WINDOW</Lbl>
            <Lbl>8.42 KM — OPPOSITE RIM A′</Lbl>
          </div>
        </Panel>
      </div>

      {/* ══ RIGHT RAIL ═════════════════════════════════════════ */}
      <div className="min-w-0 space-y-2 xl:col-span-3">
        {/* convergence */}
        <Panel title="PHOTOMETRIC CONVERGENCE" right={<Chip tone="gr" dot>LOCK STATE</Chip>} corners accent="gr">
          <div className="flex items-center gap-3">
            <Gauge
              value={c.fidelity}
              max={100}
              size={86}
              stroke={6}
              tone="gr"
              className="shrink-0"
              label="FIDELITY"
              center={<span className="text-[16px] font-extrabold mono-tabular text-gr text-glow-gr">{c.fidelity}%</span>}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div>
                <Lbl className="block">ITERATION CYCLE</Lbl>
                <div className="text-[13px] font-extrabold mono-tabular text-ink">
                  {c.iterations}{" "}
                  <span className="text-[8.5px] font-bold tracking-[0.1em] text-gr">[CONVERGED]</span>
                </div>
              </div>
              <KV k="RESIDUAL RMSE" v={`${c.rmse} I/F`} vClass="text-gr" />
              <KV k="PEAK PSNR GAIN" v={`${c.psnrGain} dB`} vClass="text-cy" />
            </div>
          </div>
        </Panel>

        {/* 2×2 quality stats */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="hud-inset p-2">
            <Stat label="HOR RANGE EXPAND" value={c.horRange} sub="Shadow Boost" tone="cy" size="sm" />
          </div>
          <div className="hud-inset p-2">
            <Stat label="SSIM STRUCTURAL" value={c.ssim} sub="Phase Match" tone="gr" size="sm" />
          </div>
          <div className="hud-inset p-2">
            <Stat label="FLUX RESTORATION" value={c.flux} sub="Azimuth Bias Null" tone="am" size="sm" />
          </div>
          <div className="hud-inset p-2">
            <Stat label="TIE-POINT YIELD" value={c.tieYield} sub="PSR Bowl Feature" tone="gr" size="sm" />
          </div>
        </div>

        {/* error distribution */}
        <Panel title="RADIANCE ERROR DISTRIBUTION (64 BINS)" right={<Chip>{"CUTOFF < 0.05"}</Chip>}>
          <div className="mb-1.5 flex justify-center">
            <Chip tone="cy">μ = 0.000</Chip>
          </div>
          <Histogram bins={ERR_BINS} labels={["−0.10 I/F", "+0.10 I/F"]} height={78} toneFor={errTone} />
        </Panel>

        {/* IIRS spectral profiler */}
        <IirsSpectral />

        {/* VLM advisory */}
        <Panel title="VLM GEOAI-V4.1 PHOTOMETRIC ADVISORY" right={<Chip tone="gr" dot>STREAMING</Chip>} accent="gr">
          <div className="max-h-40 min-h-[64px] overflow-y-auto pr-1">
            {intelLoading && intel.length === 0 ? (
              <p className="caret text-[10.5px] tracking-[0.08em] text-faint">ACQUIRING LUNAR-GEOAI UPLINK…</p>
            ) : (
              <IntelFeed key={feedTick} lines={intel} speed={10} />
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <Btn
              variant="ghost"
              icon={<RefreshCw className={cn("size-3", intelLoading && "animate-spin")} />}
              onClick={() => void loadIntel()}
              title="Re-fetch VLM photometric intel"
            >
              REFRESH INTEL
            </Btn>
          </div>
        </Panel>

        {/* actions */}
        <div className="space-y-2">
          <Btn variant="accent" full icon={<Layers className="size-3.5" />} onClick={handleApply}>
            APPLY CORRECTION &amp; EXPORT MULTI-BAND TIFF
          </Btn>
          <div className="grid grid-cols-2 gap-2">
            <Btn icon={<Calculator className="size-3.5" />} onClick={handleRecalc}>
              RECALCULATE RESIDUALS
            </Btn>
            <Btn icon={<Undo2 className="size-3.5" />} onClick={handleReset}>
              RESET TO RAW
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
