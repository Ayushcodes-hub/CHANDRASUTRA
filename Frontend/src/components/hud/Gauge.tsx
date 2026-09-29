"use client";

/**
 * LUNARMATCH 2.0 — circular arc gauge
 * Mirrors the SOLAR EPHEMERIS / CONVERGENCE dials of the reference console.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function Gauge({
  value,
  max = 100,
  size = 74,
  stroke = 5,
  tone = "cy",
  label,
  sub,
  center,
  centerClass,
  ticks = true,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: "cy" | "gr" | "am" | "rd" | "vi";
  label?: React.ReactNode;
  sub?: React.ReactNode;
  center?: React.ReactNode;
  centerClass?: string;
  ticks?: boolean;
  className?: string;
}) {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const span = 0.75; // 270° dial
  const frac = Math.min(1, Math.max(0, value / max));
  const color = { cy: "#2dd9ec", gr: "#46e08f", am: "#ffb454", rd: "#ff5d5d", vi: "#b18cff" }[tone];

  const tickEls = React.useMemo(() => {
    if (!ticks) return null;
    return Array.from({ length: 13 }).map((_, i) => {
      const a = (-225 + (i * 270) / 12) * (Math.PI / 180);
      const inner = r - 4;
      const outer = r + 1;
      const active = i / 12 <= frac;
      return (
        <line
          key={i}
          x1={size / 2 + Math.sin(a) * inner}
          y1={size / 2 - Math.cos(a) * inner}
          x2={size / 2 + Math.sin(a) * outer}
          y2={size / 2 - Math.cos(a) * outer}
          stroke={active ? color : "#22303e"}
          strokeWidth={1}
          opacity={active ? 0.9 : 0.7}
        />
      );
    });
  }, [frac, r, size, color, ticks]);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          {tickEls}
          {/* dial track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#16202b"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * span} ${c}`}
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />
          {/* value arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * span * frac} ${c}`}
            transform={`rotate(135 ${size / 2} ${size / 2})`}
            style={{
              filter: `drop-shadow(0 0 5px ${color}aa)`,
              transition: "stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </svg>
        <div className={cn("absolute inset-0 flex flex-col items-center justify-center", centerClass)}>
          {center}
        </div>
      </div>
      {(label || sub) && (
        <div className="text-center leading-tight">
          {label && <div className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-dim">{label}</div>}
          {sub && <div className="text-[8px] uppercase tracking-[0.1em] text-faint mt-0.5">{sub}</div>}
        </div>
      )}
    </div>
  );
}

/* ── Radial progress (full ring, e.g. homography lock) ─────── */
export function Ring({
  pct,
  size = 54,
  stroke = 4,
  tone = "gr",
  className,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  tone?: "cy" | "gr" | "am" | "rd";
  className?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, pct / 100));
  const color = { cy: "#2dd9ec", gr: "#46e08f", am: "#ffb454", rd: "#ff5d5d" }[tone];
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#16202b" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          style={{ filter: `drop-shadow(0 0 4px ${color}88)`, transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
