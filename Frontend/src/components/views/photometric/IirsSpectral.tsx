"use client";

/**
 * LUNARMATCH 2.0 — IIRS SPECTRAL PROFILER
 * Chandrayaan-2 Imaging Infra-Red Spectrometer reflectance strip:
 * deterministic 0.8–5.0 μm curve, band selection, hover wavelength probe,
 * H₂O-ice absorption marker for the Shackleton PSR floor.
 */
import * as React from "react";
import { Panel, Lbl, Chip, KV } from "@/components/hud/primitives";
import { cn } from "@/lib/utils";
import { useMission } from "@/lib/mission-store";

/* deterministic pseudo-noise (no Math.random → SSR-stable) */
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/* reflectance model: continuum + mineral dips (0.8–5.0 μm) */
function reflectance(l: number): number {
  const continuum = 0.3 + 0.15 * Math.exp(-((l - 1.72) ** 2) / 1.3) - 0.028 * (l - 0.8);
  const dip19 = -0.045 * Math.exp(-((l - 1.93) ** 2) / 0.02);
  const dip30 = -0.168 * Math.exp(-((l - 3.0) ** 2) / 0.14);
  return Math.max(0.04, continuum + dip19 + dip30);
}

const BANDS = [
  { id: "B1000", label: "1.00 μm", note: "PYROXENE / OLIVINE", R: "0.342", depth: "8.2%", snr: "48.2 dB", ice: false },
  { id: "B1500", label: "1.50 μm", note: "CONTINUUM REF", R: "0.401", depth: "4.6%", snr: "52.7 dB", ice: false },
  { id: "B2000", label: "2.00 μm", note: "ORTHOPYROXENE", R: "0.388", depth: "12.4%", snr: "44.9 dB", ice: false },
  { id: "B3000", label: "3.00 μm", note: "H₂O ICE / OH⁻", R: "0.212", depth: "31.8%", snr: "28.6 dB", ice: true },
] as const;

type BandId = (typeof BANDS)[number]["id"];

const W0 = 0.8;
const W1 = 5.0;
const VW = 320;
const VH = 108;
const PAD = 4;

export function IirsSpectral() {
  const logEvent = useMission((s) => s.logEvent);
  const [band, setBand] = React.useState<BandId>("B3000");
  const [probe, setProbe] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const sel = BANDS.find((b) => b.id === band)!;
  const selW = parseFloat(sel.label);

  /* sampled path */
  const pts = React.useMemo(() => {
    const arr: [number, number][] = [];
    const N = 180;
    for (let i = 0; i <= N; i++) {
      const l = W0 + ((W1 - W0) * i) / N;
      const r = reflectance(l) + (noise(i) - 0.5) * 0.012;
      const x = PAD + ((l - W0) / (W1 - W0)) * (VW - PAD * 2);
      const y = VH - PAD - r * (VH - PAD * 2) * 1.9;
      arr.push([x, Math.max(PAD, Math.min(VH - PAD, y))]);
    }
    return arr;
  }, []);

  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${VW - PAD},${VH - PAD} L${PAD},${VH - PAD} Z`;
  const wToX = (l: number) => PAD + ((l - W0) / (W1 - W0)) * (VW - PAD * 2);
  const xToW = (x: number) => W0 + ((x - PAD) / (VW - PAD * 2)) * (W1 - W0);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = ((e.clientX - rect.left) / rect.width) * VW;
    setProbe(Math.min(W1, Math.max(W0, xToW(vx))));
  };

  return (
    <Panel
      title="IIRS SPECTRAL PROFILER"
      right={<Chip tone={sel.ice ? "am" : "dim"} dot={sel.ice}>{sel.ice ? "ICE SIGNATURE" : "CH-2 IIRS"}</Chip>}
      corners
    >
      {/* band chips */}
      <div className="mb-1.5 flex flex-wrap items-center gap-1" role="group" aria-label="Spectral band selection">
        {BANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={band === b.id}
            onClick={() => {
              setBand(b.id);
              logEvent("DATA", `IIRS BAND → ${b.id}`, `${b.label} ${b.note}`);
            }}
            className={cn(
              "border px-1.5 py-[3px] text-[8.5px] font-extrabold uppercase tracking-[0.12em] transition-colors",
              band === b.id
                ? b.ice
                  ? "border-am/70 bg-am/10 text-am"
                  : "border-[#a78bfa]/60 bg-[#a78bfa]/10 text-[#c4b5fd]"
                : "border-line text-faint hover:text-dim"
            )}
          >
            {b.id}
          </button>
        ))}
        <span className="mono-tabular ml-auto text-[8.5px] text-faint">0.8–5.0 μm · 25 nm</span>
      </div>

      {/* spectrum */}
      <div className="hud-inset relative" onPointerLeave={() => setProbe(null)}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          role="img"
          aria-label={`IIRS reflectance spectrum, selected band ${sel.id} at ${sel.label}, ${sel.note}`}
          className="block h-[108px] w-full cursor-crosshair touch-none"
          onPointerMove={onMove}
        >
          <defs>
            <linearGradient id="iirs-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* grid */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PAD} x2={VW - PAD} y1={VH * f} y2={VH * f} stroke="#1a2430" strokeWidth="0.7" />
          ))}
          {[1, 2, 3, 4, 5].map((l) => (
            <g key={l}>
              <line x1={wToX(l)} x2={wToX(l)} y1={PAD} y2={VH - PAD} stroke="#1a2430" strokeWidth="0.7" strokeDasharray="2 3" />
              <text x={wToX(l)} y={VH - 0.5} textAnchor="middle" fontSize="6.5" fill="#5c7185" fontFamily="var(--font-mono)">
                {l}
              </text>
            </g>
          ))}

          {/* H₂O ice absorption window */}
          <rect x={wToX(2.85)} y={PAD} width={wToX(3.18) - wToX(2.85)} height={VH - PAD * 2} fill="#ffb454" opacity="0.09" />
          <line x1={wToX(3.0)} x2={wToX(3.0)} y1={PAD} y2={VH - PAD} stroke="#ffb454" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.8" />
          <text x={wToX(3.0) + 3} y={PAD + 8} fontSize="6.5" fill="#ffb454" fontFamily="var(--font-mono)" letterSpacing="0.5">
            H₂O 3.0μm
          </text>

          {/* curve */}
          <path d={areaPath} fill="url(#iirs-fill)" />
          <path d={path} fill="none" stroke="#c4b5fd" strokeWidth="1.4" style={{ filter: "drop-shadow(0 0 3px rgba(167,139,250,0.6))" }} />

          {/* selected band marker */}
          <line x1={wToX(selW)} x2={wToX(selW)} y1={PAD} y2={VH - PAD} stroke={sel.ice ? "#ffb454" : "#a78bfa"} strokeWidth="1.2" />
          <circle
            cx={wToX(selW)}
            cy={Math.max(PAD, VH - PAD - reflectance(selW) * (VH - PAD * 2) * 1.9)}
            r="2.6"
            fill={sel.ice ? "#ffb454" : "#c4b5fd"}
            style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
          />

          {/* hover probe */}
          {probe !== null && (
            <g>
              <line x1={wToX(probe)} x2={wToX(probe)} y1={PAD} y2={VH - PAD} stroke="#2dd9ec" strokeWidth="0.8" strokeDasharray="2 2" />
              <text x={Math.min(wToX(probe) + 3, VW - 92)} y={PAD + 16} fontSize="7" fill="#2dd9ec" fontFamily="var(--font-mono)">
                {probe.toFixed(2)}μm R={reflectance(probe).toFixed(3)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* band readout */}
      <div className="mt-1.5 space-y-1">
        <KV k={`BAND ${sel.id} — ${sel.note}`} v={sel.label} vClass={sel.ice ? "text-am" : "text-[#c4b5fd]"} />
        <div className="grid grid-cols-3 gap-1.5">
          <div className="hud-inset px-1.5 py-1">
            <Lbl className="block text-[7.5px]">REFLECTANCE</Lbl>
            <span className="mono-tabular text-[10.5px] font-extrabold text-ink">{sel.R}</span>
          </div>
          <div className="hud-inset px-1.5 py-1">
            <Lbl className="block text-[7.5px]">BAND DEPTH</Lbl>
            <span className={cn("mono-tabular text-[10.5px] font-extrabold", sel.ice ? "text-am" : "text-gr")}>{sel.depth}</span>
          </div>
          <div className="hud-inset px-1.5 py-1">
            <Lbl className="block text-[7.5px]">SNR</Lbl>
            <span className="mono-tabular text-[10.5px] font-extrabold text-cy">{sel.snr}</span>
          </div>
        </div>
        {sel.ice && (
          <p className="text-[8.5px] leading-snug tracking-[0.04em] text-am/90">
            ▲ ABSORPTION CONFIRMED — 3.0 μm feature over PSR floor pixel (89.9°S) consistent with exposed water-ice frost.
          </p>
        )}
      </div>
    </Panel>
  );
}
