"use client";

/**
 * LUNARMATCH 2.0 — SVG charts: histogram + sparkline + area profile
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Histogram (64-bin radiance error / accuracy distribution) ── */
export function Histogram({
  bins,
  labels,
  height = 74,
  toneFor,
  className,
}: {
  bins: number[];
  labels?: [React.ReactNode, React.ReactNode];
  height?: number;
  toneFor?: (i: number, n: number) => string;
  className?: string;
}) {
  const max = Math.max(...bins, 0.0001);
  const n = bins.length;
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {bins.map((b, i) => {
          const h = Math.max(2, (b / max) * (height - 6));
          const color = toneFor ? toneFor(i, n) : "#2dd9ec";
          return (
            <div
              key={i}
              className="flex-1 rounded-t-[1px] transition-[height] duration-500"
              style={{
                height: h,
                background: `linear-gradient(180deg, ${color}, ${color}44)`,
                boxShadow: `0 0 6px ${color}33`,
              }}
              title={b.toFixed(3)}
            />
          );
        })}
      </div>
      {labels && (
        <div className="flex justify-between mt-1 text-[8px] uppercase tracking-[0.1em] text-faint">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  );
}

/* ── Sparkline (benchmark history) ──────────────────────────── */
export function Sparkline({
  points,
  width = 220,
  height = 54,
  tone = "#2dd9ec",
  fill = true,
  className,
  dots = false,
}: {
  points: number[];
  width?: number;
  height?: number;
  tone?: string;
  fill?: boolean;
  className?: string;
  dots?: boolean;
}) {
  const gradId = React.useId();
  if (points.length < 2) return <div style={{ height }} className={className} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 6;
  const px = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const py = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const area = `${d} L${px(points.length - 1).toFixed(1)},${height - 2} L${px(0).toFixed(1)},${height - 2} Z`;
  const id = gradId;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className={className} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.28" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={tone} strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 4px ${tone}88)` }} />
      {dots &&
        points.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r="2" fill={tone} />)}
    </svg>
  );
}

/* ── Transect profile (rim → floor → rim cross-section) ─────── */
export function TransectProfile({
  width = 560,
  height = 190,
  tone = "#2dd9ec",
  className,
  probeX,
  onProbe,
  markers = true,
}: {
  width?: number;
  height?: number;
  tone?: string;
  className?: string;
  probeX?: number | null;
  onProbe?: (x: number | null) => void;
  markers?: boolean;
}) {
  const ref = React.useRef<SVGSVGElement>(null);
  const id = React.useId();

  // Elevation profile of Shackleton rim-to-floor transect (21 km)
  const pts = React.useMemo(() => {
    const raw: [number, number][] = [
      [0.0, 980], [0.8, 1060], [1.4, 1120], [2.0, 1085], [2.6, 990],
      [3.4, 700], [4.2, 260], [5.0, -320], [5.8, -900], [6.6, -1480],
      [7.4, -2010], [8.4, -2520], [9.4, -2940], [10.4, -3260], [11.4, -3520],
      [12.4, -3740], [13.4, -3900], [14.6, -4060], [15.8, -4180], [17.0, -4260],
      [18.2, -4280], [19.0, -4120], [19.6, -3600], [20.0, -2810], [20.4, -1700],
      [20.7, -420], [20.9, 380], [21.0, 980],
    ];
    const maxAbs = 4600;
    const padX = 10;
    const topPad = 26;
    const botPad = 16;
    return raw.map(([km, m]) => [
      padX + (km / 21) * (width - padX * 2),
      topPad + ((maxAbs - m) / (maxAbs * 2)) * (height - topPad - botPad),
    ]);
  }, [width, height]);

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height - 14} L${pts[0][0].toFixed(1)},${height - 14} Z`;
  const psrL = pts[19][0];
  const psrR = pts[pts.length - 3][0];

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current || !onProbe) return;
    const rect = ref.current.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * width;
    onProbe(Math.min(21, Math.max(0, ((rel - 10) / (width - 20)) * 21)));
  };

  const probePx = probeX != null ? 10 + (probeX / 21) * (width - 20) : null;
  // interpolate elevation at probe
  const probeEl =
    probeX != null
      ? (() => {
          for (let i = 1; i < pts.length; i++) {
            const kmA = ((pts[i - 1][0] - 10) / (width - 20)) * 21;
            const kmB = ((pts[i][0] - 10) / (width - 20)) * 21;
            if (probeX <= kmB) {
              const t = (probeX - kmA) / (kmB - kmA || 1);
              return Math.round(4600 - ((pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])) - 26) / (height - 42) * 9200);
            }
          }
          return -4280;
        })()
      : null;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className={cn("select-none", className)}
      preserveAspectRatio="none"
      onMouseMove={handleMove}
      onMouseLeave={() => onProbe?.(null)}
      role="img"
      aria-label="Rim to floor elevation transect"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.34" />
          <stop offset="70%" stopColor={tone} stopOpacity="0.10" />
          <stop offset="100%" stopColor="#143a7e" stopOpacity="0.30" />
        </linearGradient>
      </defs>

      {/* PSR shadow zone */}
      <rect x={psrL} y={12} width={psrR - psrL} height={height - 26} fill="url(#psrHatch)" opacity="0.35" />
      <defs>
        <pattern id="psrHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="rgba(20,58,126,0.35)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(84,140,255,0.5)" strokeWidth="1" />
        </pattern>
      </defs>
      <text x={(psrL + psrR) / 2} y={height - 20} textAnchor="middle" fontSize="8" fill="#7fa8e8" letterSpacing="1.5">
        PERMANENTLY SHADOWED REGION (PSR)
      </text>

      {/* grid */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={10} x2={width - 10} y1={12 + f * (height - 28)} y2={12 + f * (height - 28)} stroke="#1a2531" strokeWidth="1" />
      ))}

      {/* critical slip sector */}
      <line x1={pts[6][0]} x2={pts[6][0]} y1={10} y2={height - 14} stroke="#ffb454" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
      <text x={pts[6][0] + 4} y={20} fontSize="7.5" fill="#ffb454" letterSpacing="1">
        WALL INCLINE (31.8° HAZARD)
      </text>

      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={tone} strokeWidth="1.8" style={{ filter: `drop-shadow(0 0 5px ${tone}77)` }} />

      {markers && (
        <>
          <circle cx={pts[2][0]} cy={pts[2][1]} r="3" fill="#ffb454" />
          <text x={pts[2][0] + 5} y={pts[2][1] - 6} fontSize="8" fill="#ffb454" letterSpacing="0.5">
            RIM CREST A (+1,120m)
          </text>
          <circle cx={pts[pts.length - 1][0] - 1} cy={pts[pts.length - 1][1]} r="3" fill="#ffb454" />
          <text x={pts[pts.length - 1][0] - 8} y={pts[pts.length - 1][1] - 8} fontSize="8" fill="#ffb454" textAnchor="end" letterSpacing="0.5">
            OPPOSITE RIM B (+980m)
          </text>
          <circle cx={pts[21][0]} cy={pts[21][1]} r="2.5" fill="#548cff" />
          <text x={pts[21][0] - 4} y={pts[21][1] + 12} fontSize="7.5" fill="#7fa8e8" textAnchor="end" letterSpacing="0.5">
            FLOOR NADIR −4,280m · VOLATILES DEPOSIT
          </text>
        </>
      )}

      {/* probe */}
      {probePx != null && (
        <g>
          <line x1={probePx} x2={probePx} y1={8} y2={height - 14} stroke="#eaf6ff" strokeWidth="1" opacity="0.85" />
          <circle cx={probePx} cy={26} r="3" fill="#eaf6ff" />
          <text x={probePx + 5} y={38} fontSize="8.5" fill="#eaf6ff" fontWeight="700">
            {probeX!.toFixed(2)} km · {probeEl}m
          </text>
        </g>
      )}

      {/* axis */}
      <line x1={10} x2={width - 10} y1={height - 14} y2={height - 14} stroke="#263342" strokeWidth="1" />
    </svg>
  );
}
