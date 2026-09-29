"use client";

/**
 * LUNARMATCH 2.0 — HGA POINTING DIAL (TopBar widget)
 * Compact az/el instrument: cyan needle = high-gain antenna azimuth,
 * amber arc = elevation above horizon, amber sun glyph = subsolar bearing.
 * F2 (invertSun) flips the solar bearing 180° — visible instrument feedback.
 */
import * as React from "react";
import { useMission } from "@/lib/mission-store";

const R = 21; // dial radius (px within 48 viewBox)
const C = 24; // center

/*
 * Trig is rounded to 3dp before it reaches the DOM: Node and Chrome libm
 * disagree in the tail digits of sin/cos, which React reads as a hydration
 * mismatch on every SVG coordinate (server "8.844555433772326" vs client
 * "8.844555433772328"). 3dp ≈ 1/500 px at this size — far below perception.
 */
const r3 = (v: number) => Math.round(v * 1000) / 1000;

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [r3(cx + r * Math.cos(rad)), r3(cy + r * Math.sin(rad))];
}

function arcPath(startDeg: number, endDeg: number, r: number): string {
  const [x1, y1] = polar(C, C, r, startDeg);
  const [x2, y2] = polar(C, C, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function SunDial() {
  const az = useMission((s) => s.stationAz);
  const el = useMission((s) => s.stationElev);
  const invertSun = useMission((s) => s.invertSun);

  /* sun bearing: slow drift across the pass; F2 flips it 180° */
  const sunAz = (az - 38 + (invertSun ? 180 : 0)) % 360;

  return (
    <div
      className="hidden md:flex items-center gap-2 hud-inset px-2 py-1 leading-tight"
      title="High-gain antenna pointing · azimuth needle / elevation arc · amber = subsolar bearing (F2 flips)"
      aria-label={`Antenna azimuth ${az.toFixed(1)} degrees, elevation ${el.toFixed(1)} degrees`}
    >
      <svg width="42" height="42" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        {/* bezel */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="#1c2733" strokeWidth="2.5" />
        <circle cx={C} cy={C} r={R} fill="none" stroke="#0e141d" strokeWidth="1" />

        {/* azimuth ticks every 30°, cardinal heavier */}
        {Array.from({ length: 12 }, (_, i) => {
          const deg = i * 30;
          const cardinal = i % 3 === 0;
          const [x1, y1] = polar(C, C, cardinal ? R - 6 : R - 3.5, deg);
          const [x2, y2] = polar(C, C, R - 1, deg);
          return (
            <line
              key={deg}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={cardinal ? "#3d4f63" : "#26313f"}
              strokeWidth={cardinal ? 1.6 : 1}
            />
          );
        })}
        {/* N marker */}
        {(() => {
          const [nx, ny] = polar(C, C, R - 10, 0);
          return (
            <text x={nx} y={ny + 2} textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#7f93a8" fontFamily="monospace">
              N
            </text>
          );
        })()}

        {/* elevation arc (amber) — 0..90° maps 180°→0° of the lower-right quadrant sweep */}
        <path d={arcPath(180, 180 + Math.max(4, Math.min(90, el) * 2), R - 2)} fill="none" stroke="#ffb454" strokeWidth="2.4" opacity="0.9" style={{ filter: "drop-shadow(0 0 2px #ffb45488)" }} />

        {/* AZ needle (cyan) */}
        <g style={{ transform: `rotate(${az}deg)`, transformOrigin: "24px 24px", transition: "transform 900ms linear" }}>
          <line x1={C} y1={C} x2={C} y2={C - (R - 5)} stroke="#2dd9ec" strokeWidth="1.8" style={{ filter: "drop-shadow(0 0 3px #2dd9ec99)" }} />
          <polygon points={`${C},${C - R + 2.5} ${C - 2.4},${C - R + 7.5} ${C + 2.4},${C - R + 7.5}`} fill="#2dd9ec" />
        </g>

        {/* sun glyph (amber, jumps 180° on F2) */}
        {(() => {
          const [sx, sy] = polar(C, C, R - 8.5, sunAz);
          return (
            <g style={{ transition: "all 600ms ease" }}>
              <circle cx={sx} cy={sy} r="2.6" fill="none" stroke="#ffb454" strokeWidth="1.1" opacity="0.95" />
              <circle cx={sx} cy={sy} r="0.9" fill="#ffb454" />
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i * 45 * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1={r3(sx + Math.cos(a) * 3.4)}
                    y1={r3(sy + Math.sin(a) * 3.4)}
                    x2={r3(sx + Math.cos(a) * 4.6)}
                    y2={r3(sy + Math.sin(a) * 4.6)}
                    stroke="#ffb454"
                    strokeWidth="0.7"
                    opacity="0.8"
                  />
                );
              })}
            </g>
          );
        })()}

        {/* hub */}
        <circle cx={C} cy={C} r="1.8" fill="#0b1017" stroke="#2dd9ec" strokeWidth="0.7" />
      </svg>

      <div className="flex flex-col leading-tight">
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-faint">HGA AZ/EL</span>
        <span className="text-[11px] font-extrabold mono-tabular text-cy leading-tight">
          {az.toFixed(1)}°<span className="text-faint mx-0.5">/</span>
          <span className="text-am">{el.toFixed(1)}°</span>
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-faint">
          SOL {sunAz.toFixed(0).padStart(3, "0")}° {invertSun && <span className="text-am">· INV</span>}
        </span>
      </div>
    </div>
  );
}
