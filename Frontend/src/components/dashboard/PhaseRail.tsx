"use client";

/**
 * LUNARMATCH 2.0 — MISSION PHASE TIMELINE RAIL
 * Slim instrument strip under the TopBar: macro mission phases
 * (LAUNCH → TLI CRUISE → LOI → MAPPING → DESCENT → SURFACE OPS)
 * derived from mission elapsed time, plus the micro DSN pass progress
 * cursor with a live handover marker. Survives narrow widths via
 * horizontal scroll; hidden below md (compact chip lives in StatusBar).
 */
import * as React from "react";
import { useMission, PASS_DURATION, DSN_STATIONS, fmt } from "@/lib/mission-store";
import { cn } from "@/lib/utils";

type Phase = {
  /** inclusive MET start, seconds */
  from: number;
  id: string;
  label: string;
  note: string;
};

const PHASES: Phase[] = [
  { from: 0, id: "launch", label: "LAUNCH + ASCENT", note: "LVM3-M5 · SRIHARIKOTA PAD-2" },
  { from: 90, id: "tli", label: "TRANS-LUNAR CRUISE", note: "4 TRAJECTORY CORRECTIONS SCHEDULED" },
  { from: 240, id: "loi", label: "ORBIT INSERTION", note: "100KM POLAR · 4.3KM/S CAPTURE BURN" },
  { from: 390, id: "mapping", label: "MAPPING CAMPAIGN", note: "TMC-2 · OHRC · IIRS ALL-OPEN" },
  { from: 600, id: "descent", label: "DESCENT PREP", note: "HAZNAV STACK WARM · SITE BOGUSLAWSKY" },
  { from: 780, id: "surface", label: "SURFACE OPS", note: "ROVER DEPLOY · EPHEMERIS HANDOVER" },
];

export function PhaseRail() {
  const met = useMission((s) => s.live.met);
  const passT = useMission((s) => s.passT);
  const handoverActive = useMission((s) => s.handoverActive);
  const stationIdx = useMission((s) => s.stationIdx);
  const invertSun = useMission((s) => s.invertSun);

  const phaseIdx = React.useMemo(() => {
    let idx = 0;
    for (let i = 0; i < PHASES.length; i++) if (met >= PHASES[i].from) idx = i;
    return idx;
  }, [met]);

  const passFrac = Math.min(1, passT / PASS_DURATION);
  const station = DSN_STATIONS[stationIdx];
  /* next LOI-style milestone countdown (to next phase boundary) */
  const next = PHASES[phaseIdx + 1];
  const toNext = next ? next.from - met : null;

  return (
    <aside
      aria-label="Mission phase timeline"
      className="relative z-20 hidden md:flex items-stretch gap-0 border-b border-line bg-[#05080d]/92 backdrop-blur h-[30px] shrink-0 overflow-hidden"
    >
      {/* phase segments */}
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto lm-no-scrollbar">
        {PHASES.map((p, i) => {
          const done = i < phaseIdx;
          const active = i === phaseIdx;
          return (
            <div
              key={p.id}
              title={`${p.label} · ${p.note}`}
              className={cn(
                "group relative flex shrink-0 items-center gap-1.5 px-2.5 sm:px-3 border-r border-line/60 transition-colors",
                active && "bg-cy/[0.07]",
                !active && !done && "opacity-55",
                done && "hover:bg-gr/[0.04]",
                active && "hover:bg-cy/[0.1]"
              )}
            >
              {/* connector node */}
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-block size-[7px] rounded-full border transition-all",
                  done && "bg-gr border-gr/70 shadow-[0_0_6px_rgba(70,224,143,0.5)]",
                  active && "bg-cy border-cy shadow-[0_0_9px_rgba(45,217,236,0.75)] animate-pulse-dot",
                  !done && !active && "bg-transparent border-line2"
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap text-[8px] font-extrabold uppercase tracking-[0.14em]",
                  done && "text-gr/80",
                  active && "text-cy",
                  !done && !active && "text-faint"
                )}
              >
                {p.label}
              </span>
              {/* phase index */}
              <span
                className={cn(
                  "mono-tabular text-[7px] font-black tracking-[0.08em]",
                  active ? "text-cy/60" : "text-faint/50"
                )}
              >
                P{i}
              </span>
              {/* active sweep sheen */}
              {active && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-cy/15 to-transparent" />
              )}
              {/* completion underline */}
              {done && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gr/25" />}
            </div>
          );
        })}
      </div>

      {/* right cluster — micro pass progress */}
      <div className="flex shrink-0 items-center gap-2.5 border-l border-line bg-[#070b11]/80 px-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[7.5px] font-black uppercase tracking-[0.14em] text-faint">DSN PASS</span>
          {/* pass progress track */}
          <div
            className="relative h-[5px] w-[92px] overflow-hidden rounded-full bg-[#101822] border border-line2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(passFrac * 100)}
            aria-label={`Ground pass progress ${Math.round(passFrac * 100)} percent`}
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-linear",
                handoverActive
                  ? "bg-gradient-to-r from-am/70 to-am shadow-[0_0_8px_rgba(255,180,84,0.6)]"
                  : "bg-gradient-to-r from-cy/60 to-gr/80 shadow-[0_0_8px_rgba(45,217,236,0.4)]"
              )}
              style={{ width: `${(passFrac * 100).toFixed(1)}%` }}
            />
            {/* handover tick at handover point */}
            <span aria-hidden="true" className="absolute inset-y-0 left-[78%] w-px bg-am/70" />
          </div>
          <span className="mono-tabular text-[8px] font-extrabold text-ink/80">{String(Math.round(passFrac * 100)).padStart(2, "0")}%</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5" title={`${station.complex} · ${station.dish}`}>
          <span
            className={cn(
              "inline-block size-[5px] rounded-full",
              handoverActive ? "bg-am animate-pulse-dot" : "bg-gr"
            )}
            aria-hidden="true"
          />
          <span className={cn("text-[8px] font-extrabold uppercase tracking-[0.12em]", handoverActive ? "text-am" : "text-gr/85")}>
            {handoverActive ? "HANDOVER" : station.complex}
          </span>
        </div>

        <div className="hidden xl:flex flex-col items-end leading-none" title={next ? `Next phase: ${next.label}` : "Final mission phase"}>
          {next ? (
            <>
              <span className="text-[7px] font-bold uppercase tracking-[0.14em] text-faint">NEXT · {next.label}</span>
              <span className="mono-tabular text-[8.5px] font-extrabold text-ink/75 mt-0.5">
                T-{fmt.time(Math.max(0, toNext ?? 0)).slice(4)}
                {invertSun && <span className="text-am ml-1">SOL INV</span>}
              </span>
            </>
          ) : (
            <span className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-gr">ALL PHASES COMPLETE</span>
          )}
        </div>
      </div>
    </aside>
  );
}
