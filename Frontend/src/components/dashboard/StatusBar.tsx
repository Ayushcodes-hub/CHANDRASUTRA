"use client";

/**
 * LUNARMATCH 2.0 — bottom status bar: stream / DSN / buffer + hotkeys
 */
import * as React from "react";
import { History, BellRing } from "lucide-react";
import { useMission } from "@/lib/mission-store";
import { Dot } from "@/components/hud/primitives";

function Hotkey({ k, label, onClick, className = "" }: { k: string; label: string; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] border border-line bg-[#0a0f16] hover:border-cy/50 hover:bg-raise transition-colors group ${className}`}
      title={`${k} — ${label}`}
    >
      <span className="text-[8.5px] font-extrabold text-am tracking-[0.08em]">{k}</span>
      <span className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-dim group-hover:text-ink transition-colors">{label}</span>
    </button>
  );
}

export function StatusBar() {
  const live = useMission((s) => s.live);
  const setModule = useMission((s) => s.setModule);
  const invertSun = useMission((s) => s.invertSun);
  const toggleInvertSun = useMission((s) => s.toggleInvertSun);
  const wireframe = useMission((s) => s.wireframe);
  const toggleWireframe = useMission((s) => s.toggleWireframe);
  const replayCount = useMission((s) => s.replayEvents.length);
  const replayOpen = useMission((s) => s.replayOpen);
  const setReplayOpen = useMission((s) => s.setReplayOpen);
  const queueLen = useMission((s) => s.downlink.length);
  const handoverActive = useMission((s) => s.handoverActive);
  const alertCount = useMission((s) => s.alertLog.length);
  const unreadAlerts = useMission((s) => s.unreadAlerts);
  const alertLogOpen = useMission((s) => s.alertLogOpen);
  const setAlertLogOpen = useMission((s) => s.setAlertLogOpen);
  const criticalCount = useMission((s) => s.alertLog.filter((a) => a.sev === "CRITICAL").length);

  /* light-time delay anomaly flag — amber spike above +2.2 ms of nominal 1.2823 s */
  const delaySpike = live.delayMs > 1284.5;

  /* DSN signal 1-second trend glyph — live ▲/▼ micro-telemetry */
  const [sigTrend, setSigTrend] = React.useState<"up" | "down" | "flat">("flat");
  const prevSig = React.useRef(live.dsnSig);
  React.useEffect(() => {
    if (live.dsnSig === prevSig.current) return;
    setSigTrend(live.dsnSig > prevSig.current ? "up" : "down");
    prevSig.current = live.dsnSig;
  }, [live.dsnSig]);
  const trendGlyph = sigTrend === "up" ? "▲" : sigTrend === "down" ? "▼" : "▪";
  const trendClass = sigTrend === "up" ? "text-gr" : sigTrend === "down" ? "text-am" : "text-faint";

  return (
    <footer className="relative z-30 flex items-center justify-between gap-2 border-t border-line bg-[#05080d]/95 backdrop-blur px-2 sm:px-3 h-[34px] shrink-0 mt-auto">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
        <span className="flex items-center gap-1.5 shrink-0">
          <Dot tone={live.streamOnline ? "gr" : "rd"} />
          <span className={`text-[9px] font-extrabold uppercase tracking-[0.12em] ${live.streamOnline ? "text-gr" : "text-rd"}`}>
            STREAM: {live.streamOnline ? "ONLINE" : "REACQ"}
          </span>
        </span>
        <span className="hidden sm:block text-[9px] uppercase tracking-[0.1em] text-faint whitespace-nowrap">
          DSN SIG: <span className="text-dim font-bold mono-tabular">{live.dsnSig.toFixed(1)} dBm</span>
          <span aria-hidden="true" className={`ml-1 text-[7.5px] transition-colors duration-300 ${trendClass}`}>{trendGlyph}</span>
        </span>
        <span className="hidden md:block text-[9px] uppercase tracking-[0.1em] text-faint whitespace-nowrap">
          BUF HEALTH: <span className="text-gr font-bold mono-tabular">{live.bufHealth.toFixed(1)}%</span> <span className="text-faint">(64MB ALLOC)</span>
        </span>
        <span className="hidden lg:block text-[9px] uppercase tracking-[0.1em] text-faint whitespace-nowrap">
          CARRIER: <span className="text-cy font-bold mono-tabular">{live.uplink.toFixed(1)} MHz</span>
        </span>
        <span
          className="hidden xl:flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] text-faint whitespace-nowrap"
          title="One-way Earth↔Luna light-time — RF ranging residual"
        >
          LT DELAY:{" "}
          <span
            className={`font-bold mono-tabular transition-colors ${delaySpike ? "text-am" : "text-gr"}`}
          >
            {(live.delayMs / 1000).toFixed(4)} s
          </span>
          <span
            aria-hidden="true"
            className={`inline-block size-[4px] rounded-full ${delaySpike ? "bg-am animate-pulse-dot" : "bg-gr/70"}`}
          />
        </span>
        <span
          className={`hidden 2xl:flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] whitespace-nowrap ${handoverActive ? "text-am" : "text-faint"}`}
          title="KA-BAND downlink rate · pending product queue"
        >
          DL: {" "}
          <span className={`font-bold mono-tabular ${handoverActive ? "text-am" : "text-cy"}`}>
            {handoverActive ? "HANDOVER" : "96 MBPS"}
          </span>
          <span className="text-faint">· Q[{String(queueLen).padStart(2, "0")}]</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setAlertLogOpen(!alertLogOpen)}
          aria-pressed={alertLogOpen}
          title="Alert history triage — A · severity timeline of logged anomalies"
          className={`relative flex items-center gap-1.5 px-2 py-1 rounded-[2px] border transition-colors group ${
            alertLogOpen
              ? "border-rd/60 bg-rd/10 text-rd"
              : "border-line bg-[#0a0f16] hover:border-rd/50 hover:bg-raise"
          }`}
        >
          <BellRing className={`size-3 ${alertLogOpen ? "text-rd" : unreadAlerts > 0 ? "text-rd" : "text-dim group-hover:text-rd"}`} aria-hidden="true" />
          <span className={`text-[8.5px] font-extrabold uppercase tracking-[0.1em] ${alertLogOpen ? "text-rd" : "text-dim group-hover:text-ink"}`}>
            ALERTS
          </span>
          <span className={`mono-tabular text-[8.5px] font-bold ${criticalCount > 0 ? "text-rd" : "text-faint"}`}>
            [{String(alertCount).padStart(2, "0")}]
          </span>
          {unreadAlerts > 0 && !alertLogOpen && (
            <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-rd text-[7px] font-black text-[#1a0505] shadow-[0_0_6px_rgba(255,93,93,0.8)]">
              {Math.min(unreadAlerts, 9)}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setReplayOpen(!replayOpen)}
          aria-pressed={replayOpen}
          title="Mission replay tape — F6 · event journal & playback"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] border transition-colors group ${
            replayOpen
              ? "border-cy/60 bg-cy/10 text-cy"
              : "border-line bg-[#0a0f16] hover:border-cy/50 hover:bg-raise"
          }`}
        >
          <History className={`size-3 ${replayOpen ? "text-cy" : "text-dim group-hover:text-cy"}`} aria-hidden="true" />
          <span className={`text-[8.5px] font-extrabold uppercase tracking-[0.1em] ${replayOpen ? "text-cy" : "text-dim group-hover:text-ink"}`}>
            TAPE
          </span>
          <span className="mono-tabular text-[8.5px] font-bold text-faint">[{String(replayCount).padStart(2, "0")}]</span>
        </button>
        <Hotkey k="F1" label="WIREFRAME" onClick={toggleWireframe} />
        <Hotkey k="F2" label={invertSun ? "SUN ORIG" : "SUN INVERT"} onClick={toggleInvertSun} />
        <Hotkey k="F3" label="VLM INTEL" onClick={() => setModule("orbital")} className="hidden sm:flex" />
        <Hotkey k="ESC" label="RESET CAM" className="hidden md:flex" />
        <Hotkey k="?" label="KEYS" onClick={() => useMission.getState().setLegendOpen(!useMission.getState().legendOpen)} className="hidden md:flex" />
      </div>
    </footer>
  );
}
