"use client";

/**
 * LUNARMATCH 2.0 — DSN ground-station tracker with live handover simulation.
 * Tracks the active 70M dish across the three Deep Space Network complexes,
 * with elevation arc gauge, pass countdown and AOS/LOS handover events.
 */
import * as React from "react";
import { DSN_STATIONS, PASS_DURATION, useMission } from "@/lib/mission-store";
import { Lbl, Dot } from "@/components/hud/primitives";

/* elevation arc gauge — 180° horizon-to-horizon sweep */
function ElevArc({ elev, handover }: { elev: number; handover: boolean }) {
  const frac = Math.min(1, Math.max(0, elev / 90));
  const ang = Math.PI * (1 - frac); // 0° elev → left, 90° → zenith
  const cx = 46;
  const cy = 40;
  const r = 30;
  const nx = cx + r * 0.82 * Math.cos(ang);
  const ny = cy - r * 0.82 * Math.sin(ang);
  return (
    <svg width="92" height="48" viewBox="0 0 92 48" aria-hidden="true" className="shrink-0">
      {/* horizon arc */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1a232f" strokeWidth="2.5" strokeLinecap="round" />
      {/* traversed portion */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${nx} ${ny}`}
        fill="none"
        stroke={handover ? "#ffb454" : "#2dd9ec"}
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${handover ? "#ffb45499" : "#2dd9ec99"})`, transition: "d 0.9s linear" }}
      />
      {/* zenith tick */}
      <line x1={cx} y1={cy - r - 2} x2={cx} y2={cy - r + 2} stroke="#263342" strokeWidth="1" />
      {/* needle */}
      <circle cx={nx} cy={ny} r="2.6" fill={handover ? "#ffb454" : "#46e08f"} style={{ filter: `drop-shadow(0 0 4px ${handover ? "#ffb454" : "#46e08f"})` }} />
      <text x="6" y="46" fontSize="6" fill="#4a5a6c" letterSpacing="1">0°</text>
      <text x="80" y="46" fontSize="6" fill="#4a5a6c" letterSpacing="1">90°</text>
    </svg>
  );
}

export function DsnHandover() {
  const stationIdx = useMission((s) => s.stationIdx);
  const elev = useMission((s) => s.stationElev);
  const az = useMission((s) => s.stationAz);
  const passT = useMission((s) => s.passT);
  const handoverActive = useMission((s) => s.handoverActive);
  const handoverCountdown = useMission((s) => s.handoverCountdown);
  const station = DSN_STATIONS[stationIdx];
  const next = DSN_STATIONS[(stationIdx + 1) % DSN_STATIONS.length];
  const passRemaining = Math.max(0, PASS_DURATION - passT);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Dot tone={handoverActive ? "am" : "gr"} />
          <Lbl className="text-dim">PRIMARY LINK</Lbl>
        </div>
        <span className={`text-[8.5px] font-extrabold tracking-[0.14em] ${handoverActive ? "text-am animate-pulse-dot" : "text-gr text-glow-gr"}`}>
          {handoverActive ? "HANDOVER" : "AOS · LOCK"}
        </span>
      </div>

      {/* active station + elevation gauge */}
      <div className="flex items-center gap-2 bg-[#0a0f16] border border-line rounded-[2px] px-2 py-1.5">
        <ElevArc elev={elev} handover={handoverActive} />
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-extrabold tracking-[0.06em] text-ink truncate">{station.complex}</div>
          <div className="text-[8px] uppercase tracking-[0.1em] text-faint truncate">{station.dish} · {station.region}</div>
          <div className="mt-1 flex items-center gap-2 text-[9px] mono-tabular">
            <span className="text-faint">EL</span>
            <span className={`font-extrabold ${handoverActive ? "text-am" : "text-cy"}`}>{elev.toFixed(1)}°</span>
            <span className="text-faint">AZ</span>
            <span className="font-extrabold text-ink/85">{az.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      {/* handover countdown / pass remaining */}
      {handoverActive ? (
        <div className="mt-1.5" role="status">
          <div className="flex items-center justify-between text-[8.5px] uppercase tracking-[0.1em] mb-1">
            <span className="text-am font-bold">HANDOVER → {next.complex} IN T−{String(handoverCountdown).padStart(2, "0")}s</span>
            <span className="text-faint">LOS IMMINENT</span>
          </div>
          <div className="h-[3px] bg-[#141c26] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-am to-or animate-sweep" style={{ width: `${(handoverCountdown / 6) * 100}%` }} />
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center justify-between text-[8.5px] uppercase tracking-[0.1em]">
          <span className="text-faint">LOS → HANDOVER IN</span>
          <span className="font-bold mono-tabular text-dim">{Math.floor(passRemaining / 60)}:{String(passRemaining % 60).padStart(2, "0")}</span>
        </div>
      )}

      {/* 3-complex roster */}
      <ul className="mt-2 space-y-1" aria-label="DSN complex roster">
        {DSN_STATIONS.map((st, i) => {
          const active = i === stationIdx;
          const isNext = i === (stationIdx + 1) % DSN_STATIONS.length;
          return (
            <li key={st.id} className={`flex items-center justify-between gap-2 px-1.5 py-1 rounded-[2px] border ${active ? "border-cy/30 bg-cy/5" : "border-transparent"}`}>
              <span className={`text-[9px] tracking-[0.06em] ${active ? "text-cy font-extrabold" : "text-dim"}`}>{st.complex}</span>
              <span className={`text-[7.5px] font-extrabold uppercase tracking-[0.12em] ${active ? (handoverActive ? "text-am" : "text-gr") : isNext ? "text-cy/70" : "text-faint"}`}>
                {active ? (handoverActive ? "HANDOVER" : "● TRACKING") : isNext ? "NEXT AOS" : "STANDBY"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
