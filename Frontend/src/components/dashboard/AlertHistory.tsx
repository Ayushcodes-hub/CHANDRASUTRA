"use client";

/**
 * LUNARMATCH 2.0 — ALERT HISTORY DRAWER (A key)
 * Severity-timeline triage of every anomaly flare this session.
 * Vertical timeline rail with CRITICAL / CAUTION / ADVISORY nodes,
 * MET-stamped entries, severity filters and a purge action.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Trash2, X, TriangleAlert, Thermometer, Info, RotateCcw } from "lucide-react";
import { useMission, SEV_ORDER, type AlertSeverity } from "@/lib/mission-store";
import { fmt, hydrateAlertLog, eraseAlertStorage } from "@/lib/mission-store";
import { cn } from "@/lib/utils";

const SEV_META: Record<AlertSeverity, { tone: string; ring: string; text: string; Icon: React.ElementType }> = {
  CRITICAL: { tone: "bg-rd", ring: "border-rd/60", text: "text-rd", Icon: TriangleAlert },
  CAUTION: { tone: "bg-am", ring: "border-am/60", text: "text-am", Icon: Thermometer },
  ADVISORY: { tone: "bg-cy", ring: "border-cy/50", text: "text-cy", Icon: Info },
};

function SevChip({ sev }: { sev: AlertSeverity }) {
  const m = SEV_META[sev];
  const chip = {
    CRITICAL: "hud-chip hud-chip-rd",
    CAUTION: "hud-chip hud-chip-am",
    ADVISORY: "hud-chip hud-chip-cy",
  }[sev];
  return (
    <span className={cn(chip, "gap-1")}>
      <m.Icon className="size-2.5" aria-hidden="true" />
      {sev}
    </span>
  );
}

export function AlertHistory() {
  const open = useMission((s) => s.alertLogOpen);
  const setOpen = useMission((s) => s.setAlertLogOpen);
  const log = useMission((s) => s.alertLog);
  const clearAlerts = useMission((s) => s.clearAlerts);
  const [filter, setFilter] = React.useState<"ALL" | AlertSeverity>("ALL");
  const [restored, setRestored] = React.useState(0);

  /* rehydrate persisted anomalies once per session (localStorage journal) */
  React.useEffect(() => {
    const n = hydrateAlertLog();
    if (n > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRestored(n);
    }
  }, []);

  /* A key toggles the triage drawer */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        setOpen(!useMission.getState().alertLogOpen);
      } else if (e.key === "Escape" && useMission.getState().alertLogOpen) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [setOpen]);

  const counts = React.useMemo(() => {
    const c: Record<AlertSeverity, number> = { CRITICAL: 0, CAUTION: 0, ADVISORY: 0 };
    for (const a of log) c[a.sev] += 1;
    return c;
  }, [log]);

  const shown = React.useMemo(() => (filter === "ALL" ? log : log.filter((a) => a.sev === filter)), [log, filter]);
  const lastCritical = React.useMemo(() => [...log].reverse().find((a) => a.sev === "CRITICAL"), [log]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="dialog"
          aria-modal="false"
          aria-label="Alert history triage drawer"
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-[42px] right-2 top-[64px] z-[65] flex w-[300px] max-w-[calc(100vw-16px)] flex-col rounded-[3px] border border-line bg-[#0a0e14]/97 shadow-[0_8px_22px_-14px_rgba(0,0,0,0.9),0_0_50px_rgba(255,93,93,0.12)] backdrop-blur"
        >
          <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 size-2.5 border-l-2 border-t-2 border-cy/50" />
          <span aria-hidden="true" className="pointer-events-none absolute right-0 top-0 size-2.5 border-r-2 border-t-2 border-cy/50" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 size-2.5 border-b-2 border-l-2 border-cy/50" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 size-2.5 border-b-2 border-r-2 border-cy/50" />

          <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <BellRing className="size-[14px] shrink-0 text-rd" aria-hidden="true" />
              <h2 className="truncate text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-rd">
                Alert History · Triage
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  clearAlerts();
                  eraseAlertStorage();
                  setRestored(0);
                }}
                title="Purge alert log (memory + persisted journal)"
                aria-label="Purge alert log"
                className="rounded-[2px] border border-line p-1 text-dim transition-colors hover:border-rd/60 hover:text-rd"
              >
                <Trash2 className="size-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close drawer — A"
                aria-label="Close alert history"
                className="rounded-[2px] border border-line p-1 text-dim transition-colors hover:border-cy/60 hover:text-cy"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-1.5 border-b border-line px-3 py-2">
            {SEV_ORDER.map((sev) => {
              const m = SEV_META[sev];
              const active = filter === sev;
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setFilter(active ? "ALL" : sev)}
                  aria-pressed={active}
                  className={cn(
                    "hud-inset group flex flex-col items-start gap-0.5 px-2 py-1.5 transition-colors",
                    active ? "border-cy/50" : "hover:border-line2"
                  )}
                >
                  <span className={cn("flex items-center gap-1 text-[7.5px] font-black uppercase tracking-[0.14em]", m.text)}>
                    <span className={cn("inline-block size-[5px] rounded-full", m.tone, counts[sev] > 0 && sev === "CRITICAL" && "animate-pulse-dot")} />
                    {sev.slice(0, 4)}
                  </span>
                  <span className="text-[13px] font-extrabold mono-tabular text-ink">{String(counts[sev]).padStart(2, "0")}</span>
                </button>
              );
            })}
          </div>

          {restored > 0 && (
            <div className="flex items-center justify-between gap-2 border-b border-line/70 bg-cy/5 px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em] text-cy">
                <RotateCcw className="size-2.5" aria-hidden="true" />
                Restored {restored} persisted anomal{restored === 1 ? "y" : "ies"}
              </span>
              <button
                type="button"
                onClick={() => {
                  eraseAlertStorage();
                  setRestored(0);
                }}
                title="Detach persisted journal (memory copy stays)"
                className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-faint underline decoration-dotted underline-offset-2 transition-colors hover:text-am"
              >
                Detach
              </button>
            </div>
          )}

          {lastCritical && filter === "ALL" && (
            <div className="border-b border-line/60 bg-rd/5 px-3 py-1.5">
              <span className="text-[8px] uppercase tracking-[0.14em] text-rd/80">
                LAST CRITICAL · T+{fmt.time(lastCritical.met).slice(4)} · {lastCritical.title}
              </span>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto lm-no-scrollbar px-3 py-2">
            {shown.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <span className="inline-block size-2 rounded-full bg-gr animate-pulse-dot" aria-hidden="true" />
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-faint">
                  {log.length === 0 ? "No anomalies logged — link nominal" : "No events in this severity class"}
                </p>
                <p className="text-[8px] uppercase tracking-[0.12em] text-faint/60">A KEY TO CLOSE</p>
              </div>
            ) : (
              <ol className="relative space-y-2 pl-4" aria-label="Alert timeline">
                <span aria-hidden="true" className="absolute inset-y-1 left-[5px] w-px bg-gradient-to-b from-rd/50 via-am/30 to-cy/20" />
                {shown
                  .slice()
                  .reverse()
                  .map((a) => {
                    const m = SEV_META[a.sev];
                    return (
                      <li key={a.id} className="relative">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute -left-4 top-[7px] size-[11px] rounded-full border bg-[#0a0e14]",
                            m.ring,
                            a.sev === "CRITICAL" && "shadow-[0_0_8px_rgba(255,93,93,0.5)]"
                          )}
                        >
                          <span className={cn("absolute inset-[2.5px] rounded-full", m.tone)} />
                        </span>
                        <div className="hud-inset px-2 py-1.5 transition-colors hover:border-line2">
                          <div className="flex items-center justify-between gap-1.5">
                            <SevChip sev={a.sev} />
                            <span className="text-[8px] font-bold mono-tabular text-faint">{fmt.time(a.met).slice(4)}</span>
                          </div>
                          <div className={cn("mt-1 text-[9.5px] font-extrabold uppercase tracking-[0.1em]", m.text)}>{a.title}</div>
                          <p className="mt-0.5 text-[8.5px] leading-relaxed text-dim">{a.body}</p>
                        </div>
                      </li>
                    );
                  })}
              </ol>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-line px-3 py-1.5">
            <span className="text-[8px] uppercase tracking-[0.16em] text-faint">OPS ANOMALY BUFFER · PERSISTED · 40 MAX</span>
            <span className="text-[8px] uppercase tracking-[0.16em] text-faint">
              {log.length} REC · <span className="text-am">A</span> TOGGLE
            </span>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}