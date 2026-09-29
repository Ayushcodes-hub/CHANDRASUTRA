"use client";

/**
 * LUNARMATCH 2.0 — ELEVATION PROFILES module view
 * Hypsometric crater map, transect cross-section probe, hazards + geotech rail.
 */
import * as React from "react";
import Image from "next/image";
import { FileDown, Bot, Grid3x3 } from "lucide-react";
import { Panel, Lbl, Dot, Chip, KV, Stat, Btn, Seg, Bar, Live } from "@/components/hud/primitives";
import { RoverSim } from "@/components/views/elevation/RoverSim";
import { Gauge } from "@/components/hud/Gauge";
import { Histogram, TransectProfile } from "@/components/hud/charts";
import { ELEVATION } from "@/lib/mission-data";
import { useMission, fmt } from "@/lib/mission-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ViewMode = "ab" | "slope" | "tint" | "contour";

const MODE_OPTS: { id: ViewMode; label: string }[] = [
  { id: "ab", label: "TRANSECT A-B (ACTIVE)" },
  { id: "slope", label: "SLOPE GRADIENT MAP" },
  { id: "tint", label: "HYPSOMETRIC TINT" },
  { id: "contour", label: "CONTOURS (25m)" },
];

/* Elevation samples along the 21 km A-B profile (km, m) — mirrors chart engine */
const RAW: [number, number][] = [
  [0.0, 980], [0.8, 1060], [1.4, 1120], [2.0, 1085], [2.6, 990],
  [3.4, 700], [4.2, 260], [5.0, -320], [5.8, -900], [6.6, -1480],
  [7.4, -2010], [8.4, -2520], [9.4, -2940], [10.4, -3260], [11.4, -3520],
  [12.4, -3740], [13.4, -3900], [14.6, -4060], [15.8, -4180], [17.0, -4260],
  [18.2, -4280], [19.0, -4120], [19.6, -3600], [20.0, -2810], [20.4, -1700],
  [20.7, -420], [20.9, 380], [21.0, 980],
];

function interpEl(km: number): number {
  for (let i = 1; i < RAW.length; i++) {
    if (km <= RAW[i][0]) {
      const [k0, e0] = RAW[i - 1];
      const [k1, e1] = RAW[i];
      const t = (km - k0) / (k1 - k0 || 1);
      return e0 + t * (e1 - e0);
    }
  }
  return RAW[RAW.length - 1][1];
}

function slopeAt(km: number): number {
  const lo = Math.max(0, km - 0.8);
  const hi = Math.min(21, km + 0.8);
  const drop = Math.abs(interpEl(hi) - interpEl(lo));
  return (Math.atan(drop / ((hi - lo) * 1000)) * 180) / Math.PI;
}

const fmtM = (v: number) =>
  `${v < 0 ? "−" : "+"}${Math.abs(Math.round(v)).toLocaleString("en-US")}`;

/* 12-bin point-cloud density: rises to a dominant mid-elevation mass, bimodal shoulder */
const ELEV_BINS = [14, 24, 44, 70, 94, 100, 92, 86, 78, 60, 34, 16];

export default function ElevationProfiles() {
  const { toast } = useToast();
  const live = useMission((s) => s.live);
  const roverKm = useMission((s) => s.roverKm);
  const roverPhase = useMission((s) => s.roverPhase);

  const [mode, setMode] = React.useState<ViewMode>("tint");
  const [transect, setTransect] = React.useState("A-B");
  const [probeX, setProbeX] = React.useState<number | null>(null);
  const [tintHov, setTintHov] = React.useState<number | null>(null);

  /* Keep the MET counter alive even if no parent shell is ticking */
  React.useEffect(() => {
    let last = -1;
    const id = setInterval(() => {
      const st = useMission.getState();
      if (st.live.met === last) st.tick();
      last = st.live.met;
    }, 1100);
    return () => clearInterval(id);
  }, []);

  const km = probeX ?? 7.42;
  const el = probeX == null ? -2840 : interpEl(km);
  const slope = probeX == null ? 29.4 : slopeAt(km);
  const psr = probeX == null ? true : el <= -2000;

  const toneFor = React.useCallback((i: number, n: number) => {
    const f = i / (n - 1);
    if (f < 0.34) return "#ffb454";
    if (f < 0.62) return "#46e08f";
    if (f < 0.86) return "#2dd9ec";
    return "#548cff";
  }, []);

  return (
    <section aria-label="Elevation Profiles module" className="w-full min-w-0">
      {/* ── TOP MODULE STRIP ─────────────────────────────────── */}
      <div className="hud-panel mb-2 flex flex-wrap items-center gap-2 px-3 py-2">
        <Chip tone="cy" dot>
          MODULE: ELEVATION PROFILES [ACTIVE]
        </Chip>
        <span className="text-[10px] tracking-[0.08em] text-dim">
          GRID REF: <span className="text-ink/80">{ELEVATION.gridRef}</span>
        </span>
        <Chip tone="gr" dot>LOLA 1400HZ COHERENT</Chip>
        <Chip tone="dim">SAMPLES: {ELEVATION.samples}</Chip>
        {roverKm != null && roverPhase !== "IDLE" && (
          <Chip tone={roverPhase === "ABORT" ? "rd" : "gr"} dot>
            ROVER LINK: {roverKm.toFixed(1)} KM {roverPhase === "ABORT" ? "· ABORT" : roverPhase === "DONE" ? "· COMPLETE" : "· TRAVERSING"}
          </Chip>
        )}
        <Chip tone="rd">HAZARD INDEX: {ELEVATION.hazard}</Chip>
        <span className="ml-auto flex shrink-0 items-center gap-1.5" aria-label="Mission elapsed time">
          <Dot tone="gr" />
          <span className="text-[9px] font-bold tracking-[0.14em] text-faint">MET</span>
          <Live value={live.met} digits={0} prefix="T+000:00:00:" className="text-[10.5px] font-bold text-ink/85" />
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
        {/* ══ LEFT RAIL ══════════════════════════════════════ */}
        <div className="space-y-2 xl:col-span-3">
          {/* 1 — GEO-REF */}
          <Panel
            title="PLANETARY TARGET GEO-REF"
            right={<Chip tone="gr" dot>[EPHEMERIS LOCK]</Chip>}
            corners
            bodyClass="p-3"
          >
            <h3 className="font-display text-[19px] font-bold leading-none tracking-[0.08em] text-ink">
              {ELEVATION.crater.name}
            </h3>
            <div className="mt-1.5 h-[2px] w-28 bg-gradient-to-r from-am via-am/60 to-transparent" aria-hidden="true" />
            <p className="mt-2 text-[9px] tracking-[0.06em] text-dim">{"// "}{ELEVATION.crater.tagline}</p>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <div className="hud-inset p-2">
                <Lbl className="block leading-tight">CENTER COORD</Lbl>
                <div className="mt-1 text-[11px] font-extrabold mono-tabular text-ink/90">{ELEVATION.crater.center}</div>
              </div>
              <div className="hud-inset p-2">
                <Lbl className="block leading-tight">CRATER DIAMETER</Lbl>
                <div className="mt-1 text-[11px] font-extrabold mono-tabular text-ink/90">{ELEVATION.crater.diameter}</div>
              </div>
              <div className="hud-inset p-2">
                <Lbl className="block leading-tight">MAX NADIR DEPTH</Lbl>
                <div className="mt-1 text-[11px] font-extrabold mono-tabular text-cy text-glow-cy">
                  {ELEVATION.crater.maxDepth.replace("-", "−")} METERS
                </div>
              </div>
              <div className="hud-inset p-2">
                <Lbl className="block leading-tight">CREST RELIEF</Lbl>
                <div className="mt-1 text-[11px] font-extrabold mono-tabular text-am text-glow-am">
                  {ELEVATION.crater.crestRelief} METERS
                </div>
              </div>
            </div>
          </Panel>

          {/* 2 — MULTI-SENSOR DEM */}
          <Panel title="MULTI-SENSOR DEM" right={<Chip tone="dim">3 CO-REGISTERED STACK</Chip>}>
            <div className="space-y-1.5">
              {ELEVATION.demStack.map((d) => (
                <div key={d.name} className="hud-inset flex items-center gap-2 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10.5px] font-bold text-ink/90">{d.name}</div>
                    <div className="mt-0.5 truncate text-[8.5px] text-faint">{d.meta}</div>
                  </div>
                  <span className="h-6 w-px shrink-0 bg-line2" aria-hidden="true" />
                  <Chip tone={d.tone}>{d.status}</Chip>
                </div>
              ))}
            </div>
          </Panel>

          {/* 3 — TRANSECT VECTOR SETUP */}
          <Panel title="TRANSECT VECTOR SETUP">
            <div className="space-y-1.5" role="radiogroup" aria-label="Transect vector selection">
              {ELEVATION.transects.map((t) => {
                const active = transect === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTransect(t.id)}
                    className="hud-inset flex w-full items-center justify-between gap-2 p-2 text-left transition-colors hover:border-line2"
                    style={
                      active
                        ? {
                            backgroundColor: "rgba(45,217,236,0.07)",
                            boxShadow: "0 0 0 1px rgba(45,217,236,0.55), 0 0 14px rgba(45,217,236,0.12)",
                          }
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "truncate text-[10px] font-bold tracking-[0.06em]",
                        active ? "text-cy" : "text-dim"
                      )}
                    >
                      {t.name}
                    </span>
                    {active ? (
                      <Chip tone="cy" dot>ACTIVE</Chip>
                    ) : (
                      <Chip tone="dim">{t.meta}</Chip>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="hud-inset p-2">
                <KV k="AZIMUTH ANGLE" v="135.0° SE" />
              </div>
              <div className="hud-inset p-2">
                <KV k="INTERPOLATION" v="BICUBIC SPLINE" />
              </div>
            </div>
          </Panel>

          {/* 4 — HYPSOMETRIC TINT SPECTRUM */}
          <Panel
            title="HYPSOMETRIC TINT SPECTRUM"
            right={<Stat size="sm" label="RELIEF" value="5,400m" />}
          >
            <div className="flex gap-2.5">
              <div
                aria-hidden="true"
                className="w-1.5 shrink-0 self-stretch rounded-full"
                style={{
                  background: `linear-gradient(180deg, ${ELEVATION.tint.map((t) => t.color).join(",")})`,
                  boxShadow: "0 0 10px rgba(45,160,200,0.35)",
                }}
              />
              <div className="min-w-0 flex-1">
                {ELEVATION.tint.map((t, i) => (
                  <div
                    key={t.elev}
                    onMouseEnter={() => setTintHov(i)}
                    onMouseLeave={() => setTintHov(null)}
                    className={cn(
                      "flex items-center gap-2 rounded-[2px] px-1.5 py-1 transition-colors",
                      tintHov === i && "bg-white/[0.05]"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-8 shrink-0 rounded-[2px]"
                      style={{ background: t.color, boxShadow: `0 0 8px ${t.color}66` }}
                    />
                    <span
                      className="w-[52px] shrink-0 text-[10px] font-extrabold mono-tabular"
                      style={{ color: t.color }}
                    >
                      {t.elev}
                    </span>
                    <span className="truncate text-[9px] text-faint">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* ══ CENTER ═════════════════════════════════════════ */}
        <div className="min-w-0 space-y-2 xl:col-span-6">
          {/* 1 — TOOLBAR */}
          <div className="hud-panel flex flex-wrap items-center justify-between gap-2 px-2 py-1.5">
            <Seg options={MODE_OPTS} value={mode} onChange={setMode} aria-label="Viewport render mode" />
            <span className="hidden shrink-0 items-center gap-1.5 md:flex">
              <Dot tone="cy" />
              <span className="text-[9px] tracking-[0.12em] text-faint">
                SRC: LOLA + TMC-2 FUSION · GSD 0.5 M/PX
              </span>
            </span>
          </div>

          {/* 2 — VIEWPORT */}
          <div className="hud-viewport corners h-[400px] w-full" aria-label="Hypsometric crater map viewport">
            <span className="corner-b" aria-hidden="true" />
            <Image
              src="/imagery/crater-hypso.png"
              alt="Hypsometric elevation tint map of Shackleton crater — amber sunlit rim, teal walls, deep blue permanently shadowed floor"
              fill
              priority
              sizes="(max-width: 1279px) 100vw, 50vw"
              className="object-cover"
            />

            {/* SLOPE GRADIENT overlay */}
            {mode === "slope" && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen"
                style={{
                  background:
                    "radial-gradient(58% 52% at 50% 52%, rgba(255,93,93,0.26), transparent 72%), linear-gradient(160deg, rgba(255,180,84,0.30) 0%, rgba(70,224,143,0.22) 38%, rgba(45,217,236,0.26) 66%, rgba(20,58,126,0.44) 100%)",
                }}
              />
            )}

            {/* CONTOURS overlay */}
            {mode === "contour" && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {[
                  [9, 6.8], [16, 12.2], [23, 17.6], [30, 23], [37, 28.6], [44, 34.2],
                ].map(([rx, ry], i) => (
                  <ellipse
                    key={rx}
                    cx="50"
                    cy="50"
                    rx={rx}
                    ry={ry}
                    fill="none"
                    stroke="#2dd9ec"
                    strokeOpacity={0.55 - i * 0.05}
                    strokeWidth="1"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <ellipse
                  cx="50"
                  cy="50"
                  rx="6.5"
                  ry="4.8"
                  fill="none"
                  stroke="#548cff"
                  strokeOpacity="0.75"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}

            {/* grid + scanline + vignette + crt */}
            <div className="viewport-grid" aria-hidden="true" />
            <div className="viewport-scanline" aria-hidden="true" />
            <div className="viewport-vignette" aria-hidden="true" />
            <div className="viewport-crt" aria-hidden="true" />

            {/* TRANSECT A→B line (emphasised in TRANSECT mode) */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="17"
                y1="20"
                x2="80"
                y2="76"
                stroke="#f5f9ff"
                strokeWidth={mode === "ab" ? 1.8 : 1.3}
                strokeDasharray="4 3"
                className="match-line"
                vectorEffect="non-scaling-stroke"
                opacity={mode === "ab" ? 1 : 0.8}
                style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.55))" }}
              />
            </svg>

            {/* endpoint dots + labels */}
            <span
              aria-hidden="true"
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_7px_rgba(255,255,255,0.85)]"
              style={{ left: "17%", top: "20%" }}
            />
            <span
              aria-hidden="true"
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_7px_rgba(255,255,255,0.85)]"
              style={{ left: "80%", top: "76%" }}
            />
            <span
              className="absolute border border-white/70 bg-[#04070c]/80 px-1 py-[1px] text-[9px] font-bold leading-none text-white"
              style={{ left: "17%", top: "20%", transform: "translate(-135%, -135%)" }}
            >
              A
            </span>
            <span
              className="absolute border border-white/70 bg-[#04070c]/80 px-1 py-[1px] text-[9px] font-bold leading-none text-white"
              style={{ left: "80%", top: "76%", transform: "translate(35%, -135%)" }}
            >
              B
            </span>

            {/* ROVER TRAVERSE LIVE OVERLAY — fed by the right-rail simulator */}
            {roverKm != null && roverPhase !== "IDLE" && (
              <>
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {/* traversed track along A→B */}
                  <line
                    x1="17"
                    y1="20"
                    x2={17 + (roverKm / 21) * 63}
                    y2={20 + (roverKm / 21) * 56}
                    stroke={roverPhase === "ABORT" ? "#ff5d5d" : "#46e08f"}
                    strokeWidth="1.6"
                    strokeDasharray="2.6 2"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.95"
                    style={{ filter: `drop-shadow(0 0 3px ${roverPhase === "ABORT" ? "rgba(255,93,93,0.7)" : "rgba(70,224,143,0.65)"})` }}
                  />
                </svg>
                {/* rover marker */}
                <span
                  aria-hidden="true"
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full ${roverPhase === "ABORT" ? "bg-rd" : roverPhase === "DONE" ? "bg-cy" : "bg-gr animate-pulse-dot"}`}
                  style={{
                    left: `${17 + (roverKm / 21) * 63}%`,
                    top: `${20 + (roverKm / 21) * 56}%`,
                    width: 9,
                    height: 9,
                    boxShadow: `0 0 10px ${roverPhase === "ABORT" ? "#ff5d5d" : roverPhase === "DONE" ? "#2dd9ec" : "#46e08f"}`,
                  }}
                />
                {roverPhase === "ABORT" && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[13px] font-black leading-none text-rd"
                    style={{ left: `${17 + (roverKm / 21) * 63}%`, top: `${20 + (roverKm / 21) * 56 - 4}%` }}
                  >
                    ✕
                  </span>
                )}
                <span
                  className="pointer-events-none absolute z-10 whitespace-nowrap border border-gr/60 bg-[#04070c]/85 px-1 py-[2px] text-[8px] font-bold tracking-[0.08em] text-gr mono-tabular"
                  style={{
                    left: `calc(${17 + (roverKm / 21) * 63}% + 10px)`,
                    top: `calc(${20 + (roverKm / 21) * 56}% - 16px)`,
                  }}
                >
                  ROVER {roverKm.toFixed(1)} KM{roverPhase === "ABORT" ? " · ABORT" : roverPhase === "DONE" ? " · COMPLETE" : ""}
                </span>
              </>
            )}

            {/* callouts */}
            <div
              className="absolute -translate-x-1/2 whitespace-nowrap border border-am/70 bg-[#04070c]/80 px-1.5 py-[3px] text-[8.5px] font-bold tracking-[0.08em] text-am mono-tabular"
              style={{ left: "23%", top: "10%" }}
            >
              TGT-A [RIM CREST] +1,120m
            </div>
            <div
              className="absolute max-w-[250px] -translate-x-1/2 -translate-y-1/2 border border-[#548cff]/70 bg-[#04070c]/85 px-1.5 py-[3px] text-center text-[8.5px] font-bold leading-tight tracking-[0.06em] text-[#9dbdff] mono-tabular"
              style={{ left: "50%", top: "48%" }}
            >
              SHACKLETON PSR NADIR −4,280m (PERM SHADOW)
            </div>
            <div
              className="absolute -translate-x-1/2 whitespace-nowrap border border-am/70 bg-[#04070c]/80 px-1.5 py-[3px] text-[8.5px] font-bold tracking-[0.08em] text-am mono-tabular"
              style={{ left: "81%", top: "60%" }}
            >
              TGT-B [FLOOR/OPP] +980m
            </div>

            {/* faint geographic labels */}
            <span
              className="pointer-events-none absolute -translate-x-1/2 text-[8.5px] italic text-cy/55"
              style={{ left: "50%", top: "31%" }}
            >
              Shackleton Crater (Center)
            </span>
            <span
              className="pointer-events-none absolute text-[8.5px] italic text-cy/50"
              style={{ left: "20%", top: "86%" }}
            >
              Lunar South Pole
            </span>
            <span
              className="pointer-events-none absolute text-[8.5px] italic text-cy/55"
              style={{ left: "60%", top: "68%" }}
            >
              Crater Floor (Depths)
            </span>

            {/* N arrow */}
            <svg
              width="30"
              height="36"
              viewBox="0 0 30 36"
              className="absolute right-2 top-2"
              role="img"
              aria-label="North orientation indicator"
            >
              <text x="15" y="8" textAnchor="middle" fontSize="8" fontWeight="700" fill="#67ecf9">
                N
              </text>
              <circle cx="15" cy="22" r="12" fill="rgba(4,8,12,0.6)" stroke="rgba(45,217,236,0.55)" strokeWidth="1" />
              <path
                d="M15 28 V16 M11.5 19.5 L15 15.5 L18.5 19.5"
                stroke="#2dd9ec"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
              />
            </svg>

            {/* bottom telemetry + scale */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[#02040a]/90 via-[#02040a]/55 to-transparent px-2 pb-1.5 pt-4">
              <span className="truncate text-[8.5px] tracking-[0.08em] text-dim mono-tabular">
                TEL: LAT 89.90°S | LON 000.00°E | AZ 135.0° SE
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-[8.5px] tracking-[0.1em] text-dim">SCALE: 5,000 METERS</span>
                <span className="h-[3px] w-14 border-x border-white/80 bg-white/85" aria-hidden="true" />
              </span>
            </div>
          </div>

          {/* 3 — TRANSECT CROSS-SECTION */}
          <Panel title="TRANSECT CROSS-SECTION" right={<Chip tone="cy">PROFILE A → B</Chip>}>
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
              <div className="hud-inset px-2 py-1.5">
                <Lbl className="block leading-tight">PROBE</Lbl>
                <div className="mt-0.5 text-[11px] font-extrabold mono-tabular text-ink">
                  {km.toFixed(2)} KM
                </div>
              </div>
              <div className="hud-inset px-2 py-1.5">
                <Lbl className="block leading-tight">ELEV</Lbl>
                <div className="mt-0.5 text-[11px] font-extrabold text-cy text-glow-cy mono-tabular">
                  {fmtM(el)}m
                </div>
              </div>
              <div className="hud-inset px-2 py-1.5">
                <Lbl className="block leading-tight">SLOPE</Lbl>
                <div className="mt-0.5 text-[11px] font-extrabold text-am mono-tabular">{slope.toFixed(1)}°</div>
              </div>
              <div className="hud-inset px-2 py-1.5">
                <Lbl className="block leading-tight">SHADOW</Lbl>
                <div
                  className={cn(
                    "mt-0.5 text-[11px] font-extrabold mono-tabular",
                    psr ? "text-gr text-glow-gr" : "text-faint"
                  )}
                >
                  PSR: {psr ? "YES" : "NO"}
                </div>
              </div>
            </div>
            <div className="mt-1.5">
              <TransectProfile probeX={probeX} onProbe={setProbeX} markers />
            </div>
          </Panel>

          {/* 4 — STATS ROW */}
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
            <div className="hud-inset p-2">
              <Lbl className="block leading-tight">TOTAL RELIEF</Lbl>
              <div className="mt-1 text-[13px] font-extrabold leading-none text-ink mono-tabular">
                5,400 <span className="text-[8.5px] font-semibold text-faint">METERS</span>
              </div>
            </div>
            <div className="hud-inset p-2">
              <Lbl className="block leading-tight">AVG WALL GRADIENT</Lbl>
              <div className="mt-1 text-[13px] font-extrabold leading-none text-ink mono-tabular">
                28.6° <span className="text-[8.5px] font-semibold text-faint">INCLINE</span>
              </div>
            </div>
            <div className="hud-inset p-2">
              <Lbl className="block leading-tight">MAX CRATER SLOPE</Lbl>
              <div className="mt-1 text-[13px] font-extrabold leading-none text-am text-glow-am mono-tabular">
                34.2° <span className="text-[8.5px] font-semibold text-am/70">AT 6.8KM</span>
              </div>
            </div>
            <div className="hud-inset p-2">
              <Lbl className="block leading-tight">RUGOSITY INDEX</Lbl>
              <div className="mt-1 text-[13px] font-extrabold leading-none text-cy text-glow-cy mono-tabular">
                0.142 <span className="text-[8.5px] font-semibold text-cy/70">(MED-HIGH)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT RAIL ═════════════════════════════════════ */}
        <div className="min-w-0 space-y-2 xl:col-span-3">
          {/* 1 — ELEVATION DISTRIBUTION */}
          <Panel title="ELEVATION DISTRIBUTION" right={<Chip tone="dim">21.0K SAMPLES</Chip>}>
            <p className="mb-2 text-[8.5px] uppercase tracking-[0.12em] text-faint">
              Vertical Point Cloud Density Frequency
            </p>
            <Histogram
              bins={ELEV_BINS}
              labels={["+1,200m [RIM]", "−4,280m [FLOOR]"]}
              height={84}
              toneFor={toneFor}
            />
          </Panel>

          {/* 2 — TRAVERSABILITY HAZARDS */}
          <Panel title="TRAVERSABILITY HAZARDS" right={<Chip tone="rd" dot>WARNING</Chip>}>
            <div className="flex items-start justify-around gap-2">
              <Gauge
                value={ELEVATION.hazards.maxSlope}
                max={45}
                size={78}
                tone="rd"
                label="MAX SLOPE"
                sub="UNSUITABLE WHEELED"
                center={
                  <span className="text-[13px] font-extrabold text-rd mono-tabular">
                    {ELEVATION.hazards.maxSlope.toFixed(1)}°
                  </span>
                }
              />
              <Gauge
                value={ELEVATION.hazards.coldTrap}
                max={100}
                size={78}
                tone="am"
                label="COLD TRAP RISK"
                sub="THERMAL"
                center={
                  <span className="text-[13px] font-extrabold text-am mono-tabular">
                    {ELEVATION.hazards.coldTrap.toFixed(1)}%
                  </span>
                }
              />
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Lbl>SOLAR PERSISTENCE (RIM A)</Lbl>
                  <span className="text-[9.5px] font-bold text-am mono-tabular">
                    {ELEVATION.solarPersistence.rimA.toFixed(1)}% ILLUMINATED
                  </span>
                </div>
                <Bar tone="am" pct={ELEVATION.solarPersistence.rimA} segments={6} />
              </div>
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Lbl>SOLAR PERSISTENCE (FLOOR)</Lbl>
                  <span className="text-[9.5px] font-bold text-rd mono-tabular">
                    {ELEVATION.solarPersistence.floor.toFixed(1)}% [ETERNAL PSR]
                  </span>
                </div>
                <Bar tone="rd" pct={ELEVATION.solarPersistence.floor} segments={6} />
              </div>
            </div>
          </Panel>

          {/* 3 — LUNAR GEOTECHNICAL MATRIX */}
          <Panel title="LUNAR GEOTECHNICAL MATRIX">
            <div>
              {ELEVATION.geotech.map((g, i) => (
                <div
                  key={g.k}
                  className={cn(
                    "flex items-baseline justify-between gap-2 py-[7px]",
                    i > 0 && "border-t border-line"
                  )}
                >
                  <Lbl className="truncate">{g.k}</Lbl>
                  <span className="shrink-0 text-[11px] font-bold text-cy mono-tabular">
                    {g.v}
                    <span className="ml-1 text-[8.5px] font-normal text-faint">{g.u}</span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* 3.5 — ROVER TRAVERSE SIMULATOR */}
          <div id="lm-rover-sim">
            <RoverSim />
          </div>

          {/* 4 — ACTIONS */}
          <div className="space-y-1.5">
            <Btn
              variant="accent"
              full
              icon={<FileDown className="size-3.5" aria-hidden="true" />}
              onClick={() => {
                window.open("/api/mission/export/passes", "_blank");
                useMission.getState().enqueueProduct("TRANSECT_AB_PROFILE", "CSV", 6.8);
                toast({
                  title: "EXPORT QUEUED",
                  description: "Transect A-B CSV + GeoTIFF 32-bit → DSN uplink.",
                });
              }}
            >
              EXPORT TRANSECT CSV &amp; GEOTIFF
            </Btn>
            <div className="grid grid-cols-2 gap-1.5">
              <Btn
                icon={<Bot className="size-3.5" aria-hidden="true" />}
                onClick={() => {
                  document.getElementById("lm-rover-sim")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  toast({
                    title: "ROVER SIM READY",
                    description: "LAUNCH ROVER in the traverse simulator to begin A→B descent.",
                  });
                }}
              >
                RUN ROVER SIM
              </Btn>
              <Btn
                icon={<Grid3x3 className="size-3.5" aria-hidden="true" />}
                onClick={() =>
                  toast({
                    title: "RE-SAMPLE 0.5M",
                    description: "LOLA 1400Hz re-grid queued — 42,000 pt target density.",
                  })
                }
              >
                RE-SAMPLE 0.5M
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
