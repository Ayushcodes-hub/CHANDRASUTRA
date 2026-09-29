"use client";

/**
 * LUNARMATCH 2.0 — mission hierarchy sidebar (persistent left rail)
 */
import * as React from "react";
import { MODULES, MISSION } from "@/lib/mission-data";
import { useMission } from "@/lib/mission-store";
import { Lbl, KV, Dot, Chip } from "@/components/hud/primitives";
import { Sparkline } from "@/components/hud/charts";
import { DsnHandover } from "./DsnHandover";
import { DownlinkQueue } from "./DownlinkQueue";
import { SkyPlot } from "./SkyPlot";

const toneText = { gr: "text-gr", cy: "text-cy", am: "text-am", dim: "text-dim" };

export function MissionSidebar() {
  const live = useMission((s) => s.live);
  const mod = useMission((s) => s.module);
  const dwell = useMission((s) => s.dwell);
  const totalDwell = React.useMemo(
    () => (Object.values(dwell) as number[]).reduce((a, b) => a + b, 0),
    [dwell]
  );
  const [sigHistory, setSigHistory] = React.useState<number[]>(() => Array.from({ length: 36 }, () => -88.4));

  React.useEffect(() => {
    const id = setInterval(() => {
      setSigHistory((h) => [...h.slice(1), live.dsnSig]);
    }, 1000);
    return () => clearInterval(id);
  }, [live.dsnSig]);

  return (
    <aside
      aria-label="Mission hierarchy"
      className="hidden md:flex flex-col w-[212px] xl:w-[228px] shrink-0 border-r border-line bg-[#05080d]/92 backdrop-blur relative z-20"
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-line">
        <div className="flex items-center justify-between">
          <Lbl className="text-dim">MISSION HIERARCHY</Lbl>
          <span className="text-[9px] font-bold text-cy/80 tracking-[0.1em]">{MISSION.hierarchy}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 tape-fade">
        {/* TARGET BODY */}
        <div className="hud-inset p-2.5 corners relative">
          <span className="corner-b" aria-hidden="true" />
          <div className="flex items-center justify-between mb-1.5">
            <Lbl>TARGET BODY</Lbl>
            <span className="text-[8.5px] font-bold tracking-[0.14em] text-gr text-glow-gr">[LOCK]</span>
          </div>
          <div className="text-[13px] font-extrabold text-ink tracking-wide">{MISSION.targetBody}</div>
          <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-[0.08em]">
            <span className="text-faint">SOUTH POLE ATIT:</span>
            <span className="font-bold text-cy">{MISSION.southPoleAlt}</span>
          </div>
        </div>

        {/* VECTOR SENSOR BANK */}
        <div className="hud-inset p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Dot tone="gr" />
            <Lbl className="text-dim">VECTOR SENSOR BANK</Lbl>
          </div>
          <ul className="space-y-1.5">
            {MISSION.sensors.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] text-ink/80 tracking-[0.04em]">{s.name}</span>
                <span className={`text-[8.5px] font-extrabold uppercase tracking-[0.08em] ${toneText[s.tone]}`}>{s.status}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* EPHEMERIS STATE */}
        <div className="hud-inset p-2.5">
          <Lbl className="block mb-2 text-dim">EPHEMERIS STATE</Lbl>
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <div className="bg-[#0a0f16] border border-line rounded-[2px] px-1.5 py-1.5">
              <div className="text-[7.5px] uppercase tracking-[0.1em] text-faint">VELOCITY</div>
              <div className="text-[11px] font-extrabold mono-tabular text-ink">{live.velocity.toFixed(3)} <span className="text-[7px] text-faint">KM/S</span></div>
            </div>
            <div className="bg-[#0a0f16] border border-line rounded-[2px] px-1.5 py-1.5">
              <div className="text-[7.5px] uppercase tracking-[0.1em] text-faint">INCLINATION</div>
              <div className="text-[11px] font-extrabold mono-tabular text-ink">89.94° <span className="text-[7px] text-faint">POL</span></div>
            </div>
            <div className="bg-[#0a0f16] border border-line rounded-[2px] px-1.5 py-1.5">
              <div className="text-[7.5px] uppercase tracking-[0.1em] text-faint">PERIAPSIS</div>
              <div className="text-[11px] font-extrabold mono-tabular text-ink">98.41 <span className="text-[7px] text-faint">KM</span></div>
            </div>
            <div className="bg-[#0a0f16] border border-line rounded-[2px] px-1.5 py-1.5">
              <div className="text-[7.5px] uppercase tracking-[0.1em] text-faint">APOAPSIS</div>
              <div className="text-[11px] font-extrabold mono-tabular text-ink">101.89 <span className="text-[7px] text-faint">KM</span></div>
            </div>
          </div>
        </div>

        {/* High-rate downlink queue */}
        <DownlinkQueue />

        {/* operator attention odometer — dwell time per console module */}
        <div className="hud-inset p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <Lbl className="text-dim">MODULE DWELL · SESSION</Lbl>
            <span className="text-[7.5px] font-bold tracking-[0.12em] text-faint">ATTN ODO</span>
          </div>
          <ul className="space-y-1" aria-label="Operator dwell time per module">
            {MODULES.map((m) => {
              const active = mod === m.id;
              const secs = dwell[m.id] ?? 0;
              const mm = String(Math.floor(secs / 60)).padStart(2, "0");
              const ss = String(secs % 60).padStart(2, "0");
              const share = totalDwell > 0 ? Math.round((secs / totalDwell) * 100) : 0;
              return (
                <li key={m.id} className="group/od">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`inline-block size-[5px] rounded-full transition-colors ${
                          active ? "bg-cy animate-pulse-dot shadow-[0_0_5px_#2dd9ec]" : "bg-line2 group-hover/od:bg-dim"
                        }`}
                      />
                      <span
                        className={`text-[9px] font-extrabold tracking-[0.08em] transition-colors ${
                          active ? "text-cy" : "text-dim group-hover/od:text-ink"
                        }`}
                      >
                        {m.short}
                      </span>
                    </span>
                    <span className={`mono-tabular text-[9px] font-bold ${active ? "text-cy" : "text-faint"}`}>
                      {mm}:{ss}
                    </span>
                  </div>
                  <div className="ml-[11px] mt-[3px] h-[3px] overflow-hidden rounded-full bg-[#0d131c]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${
                        active ? "bg-gradient-to-r from-cy/70 to-cy shadow-[0_0_4px_#2dd9ec]" : "bg-line2 group-hover/od:bg-dim"
                      }`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Live polar az/el station sky track (extra flourish) */}
        <div className="hidden xl:block">
          <SkyPlot />
        </div>
      </div>

      {/* pinned DSN station tracker + signal window */}
      <div className="border-t border-line px-3 py-2.5 bg-[#070b10]">
        <DsnHandover />
        <KV
          k="UPLINK CARRIER"
          v={
            <span>
              <span className="text-ink/90">{MISSION.uplink}</span> <span className="text-gr">[OK]</span>
            </span>
          }
          className="mt-2"
        />
        <div className="mt-2 flex items-center gap-1.5">
          <Chip tone="cy" className="text-[8px]">KA-BAND</Chip>
          <Chip tone="dim" className="text-[8px]">34M BWG</Chip>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <Lbl className="text-faint">DSN SIG · 36S WINDOW</Lbl>
            <span className="text-[8px] font-bold mono-tabular text-am">{live.dsnSig.toFixed(1)} dBm</span>
          </div>
          <Sparkline points={sigHistory} width={196} height={30} tone="#ffb454" />
        </div>
      </div>
    </aside>
  );
}
