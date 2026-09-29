"use client";

/**
 * LUNARMATCH 2.0 — STATION SKY TRACK (polar az/el plot)
 * Horizon-ring radar: center = zenith (90° EL), edge = horizon (0° EL).
 * Plots the live orbiter fix from the DSN pass simulation plus a fading
 * trail of recent positions and the active ground-station heading.
 */
import * as React from "react";
import { DSN_STATIONS, useMission } from "@/lib/mission-store";
import { Lbl } from "@/components/hud/primitives";

const R = 82; // plot radius (horizon)
const CX = 92;
const CY = 92;

/* az (deg) + el (deg) → svg xy. North (az 0) is up. */
function polar(az: number, el: number): [number, number] {
  const r = R * (1 - Math.min(90, Math.max(0, el)) / 90);
  const a = ((az - 90) * Math.PI) / 180; // 0°N up → rotate
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

const AZ_TICKS: Array<{ az: number; label: string }> = [
  { az: 0, label: "N" },
  { az: 45, label: "NE" },
  { az: 90, label: "E" },
  { az: 135, label: "SE" },
  { az: 180, label: "S" },
  { az: 225, label: "SW" },
  { az: 270, label: "W" },
  { az: 315, label: "NW" },
];

export function SkyPlot() {
  const az = useMission((s) => s.stationAz);
  const el = useMission((s) => s.stationElev);
  const stationIdx = useMission((s) => s.stationIdx);
  const handover = useMission((s) => s.handoverActive);
  const passT = useMission((s) => s.passT);

  /* fading trail of recent fixes (sampled ~2 Hz to keep dots distinct) */
  const [trail, setTrail] = React.useState<Array<[number, number]>>([]);
  const lastSample = React.useRef(0);

  React.useEffect(() => {
    const now = Date.now();
    if (now - lastSample.current < 1900) return;
    lastSample.current = now;
    setTrail((prev) => [...prev.slice(-26), [az, el]]);
  }, [az, el]);

  const reduced = React.useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const [sx, sy] = polar(az, el);
  const station = DSN_STATIONS[stationIdx];
  const accent = handover ? "#ffb454" : "#2dd9ec";

  return (
    <div className="hud-inset p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <Lbl className="text-dim">STATION SKY TRACK</Lbl>
        <span className={`text-[8px] font-extrabold tracking-[0.12em] ${handover ? "text-am" : "text-gr"}`}>
          {handover ? "HANDOVER" : "TRACKING"}
        </span>
      </div>

      <svg
        viewBox="0 0 184 184"
        className="w-full"
        role="img"
        aria-label={`Polar sky track — orbiter at azimuth ${az.toFixed(0)} degrees, elevation ${el.toFixed(0)} degrees, tracked by ${station.complex}`}
      >
        <defs>
          <radialGradient id="skyc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2dd9ec" stopOpacity="0.05" />
            <stop offset="78%" stopColor="#2dd9ec" stopOpacity="0.012" />
            <stop offset="100%" stopColor="#2dd9ec" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweepfade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2dd9ec" stopOpacity="0" />
            <stop offset="100%" stopColor="#2dd9ec" stopOpacity="0.13" />
          </linearGradient>
        </defs>

        {/* horizon disc + elevation rings */}
        <circle cx={CX} cy={CY} r={R} fill="url(#skyc)" stroke="#1c2836" strokeWidth="1.2" />
        {[30, 60].map((e) => (
          <circle
            key={e}
            cx={CX}
            cy={CY}
            r={R * (1 - e / 90)}
            fill="none"
            stroke="#1a2531"
            strokeWidth="0.7"
            strokeDasharray="2 4"
          />
        ))}
        <text x={CX + 3} y={CY - R * (1 - 30 / 90) - 2} fontSize="6" fill="#3c4c5e" letterSpacing="0.6">30°</text>
        <text x={CX + 3} y={CY - R * (1 - 60 / 90) - 2} fontSize="6" fill="#3c4c5e" letterSpacing="0.6">60°</text>
        <text x={CX + 3} y={CY - 3} fontSize="6" fill="#3c4c5e" letterSpacing="0.6">90°</text>

        {/* radar sweep — rotating gradient wedge (disabled under reduced motion) */}
        {!reduced && (
          <g style={{ transformOrigin: `${CX}px ${CY}px` }} className="animate-radar" aria-hidden="true">
            <path
              d={`M ${CX} ${CY} L ${CX + R} ${CY} A ${R} ${R} 0 0 0 ${CX + R * Math.cos(-Math.PI / 5)} ${CY + R * Math.sin(-Math.PI / 5)} Z`}
              fill="url(#sweepfade)"
            />
            <line x1={CX} y1={CY} x2={CX + R} y2={CY} stroke="#2dd9ec" strokeWidth="1" opacity="0.35" style={{ filter: "drop-shadow(0 0 3px rgba(45,217,236,0.6))" }} />
          </g>
        )}

        {/* azimuth spokes + compass labels */}
        {AZ_TICKS.map((t) => {
          const [x2, y2] = polar(t.az, 0);
          const [xl, yl] = polar(t.az, -11);
          const cardinal = t.label.length === 1;
          return (
            <g key={t.az}>
              <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="#151f2b" strokeWidth="0.6" />
              <text
                x={xl}
                y={yl}
                fontSize={cardinal ? "7.5" : "5.5"}
                fontWeight={cardinal ? 700 : 400}
                fill={cardinal ? "#5a6c80" : "#39485a"}
                textAnchor="middle"
                dominantBaseline="middle"
                letterSpacing="0.8"
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {/* moon limb flourish — off-plot southwest */}
        <circle cx={24} cy={168} r={11} fill="none" stroke="#16202c" strokeWidth="1" />
        <circle cx={20.5} cy={164.5} r={2.1} fill="#232f3d" />

        {/* pass trail — fading history */}
        {trail.map(([taz, tel], i) => {
          const [tx, ty] = polar(taz, tel);
          const f = (i + 1) / trail.length;
          return (
            <circle
              key={`${i}-${taz.toFixed(1)}`}
              cx={tx}
              cy={ty}
              r={1.5}
              fill={accent}
              opacity={0.12 + f * 0.5}
            />
          );
        })}

        {/* swept pass arc — synthetic expected track for this pass */}
        <path
          d={`M ${polar(168, 4).join(" ")} Q ${CX} ${CY - R * 1.06} ${polar(220, 4).join(" ")}`}
          fill="none"
          stroke="#223344"
          strokeWidth="0.9"
          strokeDasharray="3 4"
        />

        {/* station → orbiter sight-line */}
        <line
          x1={CX}
          y1={CY}
          x2={sx}
          y2={sy}
          stroke={accent}
          strokeWidth="0.9"
          opacity="0.6"
          strokeDasharray="4 3"
          style={{ transition: "x2 0.9s linear, y2 0.9s linear" }}
        />

        {/* live orbiter fix */}
        <g style={{ transition: "transform 0.9s linear" }}>
          <circle cx={sx} cy={sy} r={7.5} fill="none" stroke={accent} strokeWidth="0.7" opacity="0.5" className={reduced ? undefined : "animate-pulse-dot"} />
          <circle cx={sx} cy={sy} r={3.2} fill={handover ? "#ffb454" : "#46e08f"} style={{ filter: `drop-shadow(0 0 5px ${handover ? "#ffb454" : "#46e08f"})` }} />
          <rect x={sx + 9} y={sy - 12} width={handover ? 74 : 60} height={13} fill="#04070c" stroke={accent} strokeOpacity="0.55" strokeWidth="0.6" />
          <text x={sx + 12} y={sy - 2.5} fontSize="7.2" fontWeight="700" fill={accent} letterSpacing="0.8">
            {handover ? "HANDOVER" : "ORB-4 · LOCK"}
          </text>
        </g>
      </svg>

      {/* footer readout */}
      <div className="mt-1 flex items-center justify-between text-[8px] uppercase tracking-[0.1em]">
        <span className="text-faint">PASS T+{String(Math.floor(passT / 60)).padStart(2, "0")}:{String(passT % 60).padStart(2, "0")}</span>
        <span className="mono-tabular font-bold text-dim">
          AZ {az.toFixed(1)}° · EL {el.toFixed(1)}°
        </span>
      </div>
    </div>
  );
}
