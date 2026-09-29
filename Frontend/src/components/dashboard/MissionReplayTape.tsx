"use client";

/**
 * LUNARMATCH 2.0 — MISSION REPLAY TAPE
 * Event journal drawer: records every operator action + anomaly,
 * re-enacts NAV events during playback with a scan-line cursor.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Pause, Trash2, X, History, FastForward } from "lucide-react";
import { useMission, REPLAY_TONE, hydrateTape, eraseTapeStorage, type ReplayEventType } from "@/lib/mission-store";
import { fmt } from "@/lib/mission-store";
import { Lbl, Chip, Dot } from "@/components/hud/primitives";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<ReplayEventType, string> = {
  NAV: "NAVIGATE",
  CMD: "COMMAND",
  ALERT: "ANOMALY",
  SYS: "SYSTEM",
  DATA: "DATA",
};

/* Dot accepts cy/gr/am/rd — SYS violet rendered via className override */
const DOT_TONE: Record<ReplayEventType, "cy" | "gr" | "am" | "rd"> = {
  NAV: "cy",
  CMD: "gr",
  ALERT: "rd",
  SYS: "cy",
  DATA: "am",
};

export function MissionReplayTape() {
  const { toast } = useToast();
  const open = useMission((s) => s.replayOpen);
  const setOpen = useMission((s) => s.setReplayOpen);
  const events = useMission((s) => s.replayEvents);
  const clearReplay = useMission((s) => s.clearReplay);
  const seq = useMission((s) => s.replaySeq);
  const setSeq = useMission((s) => s.setReplaySeq);
  const setModule = useMission((s) => s.setModule);

  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState<1 | 2>(1);
  const [filter, setFilter] = React.useState<"ALL" | ReplayEventType>("ALL");
  const [restored, setRestored] = React.useState(0);
  const [hoverX, setHoverX] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  /* hydrate persisted journal from a previous session (localStorage) */
  React.useEffect(() => {
    const n = hydrateTape();
    if (n > 0) {
      setRestored(n);
      toast({ title: "TAPE RESTORED", description: `${n} archived events reloaded — journal continuity intact.` });
    }
  }, []);

  const shown = React.useMemo(
    () => (filter === "ALL" ? events : events.filter((e) => e.type === filter)),
    [events, filter]
  );

  /* playback engine — steps the cursor; NAV events re-enact module switches */
  React.useEffect(() => {
    if (!playing || events.length === 0) return;
    const id = setInterval(() => {
      const s = useMission.getState();
      const next = s.replaySeq + 1;
      if (next >= s.replayEvents.length) {
        setPlaying(false);
        s.setReplaySeq(-1);
        toast({ title: "REPLAY COMPLETE", description: `${s.replayEvents.length} EVENTS RE-ENACTED — TAPE RESET` });
        return;
      }
      s.setReplaySeq(next);
      const ev = s.replayEvents[next];
      if (ev?.type === "NAV" && ev.module) s.setModule(ev.module);
    }, 900 / speed);
    return () => clearInterval(id);
  }, [playing, speed, events.length, toast]);

  /* auto-scroll playback cursor into view */
  React.useEffect(() => {
    if (seq < 0 || !listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-idx="${seq}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [seq]);

  /* ESC closes (unless command deck open) */
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        setPlaying(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setOpen]);

  const toneDot: Record<string, string> = {
    cy: "#2dd9ec",
    gr: "#46e08f",
    am: "#ffb454",
    rd: "#ff5d5d",
    vi: "#a78bfa",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 60, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-2 bottom-[42px] top-[62px] z-40 w-[min(92vw,352px)]"
        >
          <aside
            role="complementary"
            aria-label="Mission replay tape — event journal"
            className="hud-panel corners flex h-full flex-col overflow-hidden border-cy/25 bg-[#070b11] shadow-[0_0_50px_rgba(45,217,236,0.12)]"
          >
            <span className="corner-b" aria-hidden="true" />

          {/* header */}
          <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <History className="size-[13px] shrink-0 text-cy" aria-hidden="true" />
              <h2 className="truncate text-[10px] font-extrabold uppercase tracking-[0.18em] text-cy text-glow-cy">
                Mission Replay Tape
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {restored > 0 && (
                <span title={`Journal continuity — ${restored} events restored from previous session`}>
                  <Chip tone="cy" className="hidden sm:inline-flex">
                    RESTORED {restored}
                  </Chip>
                </span>
              )}
              <Chip tone={playing ? "gr" : "dim"} dot={playing}>
                {playing ? `PLAYBACK ${speed}×` : "HOLD"}
              </Chip>
              <button
                type="button"
                aria-label="Close replay tape"
                onClick={() => {
                  setOpen(false);
                  setPlaying(false);
                }}
                className="rounded-[2px] border border-line p-1 text-dim transition-colors hover:border-rd/60 hover:text-rd"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* timeline strip — event density + operator scrub-to-jump */}
          <div className="border-b border-line px-3 py-2">
            <div className="mb-1 flex items-center justify-between">
              <Lbl>JOURNAL TIMELINE · MET WINDOW</Lbl>
              <span className="mono-tabular text-[8.5px] text-faint">
                {events.length} EVTS · CLICK TO SCRUB
              </span>
            </div>
            <div
              role="slider"
              tabIndex={0}
              aria-label="Journal timeline scrubber — jump playback cursor"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, events.length - 1)}
              aria-valuenow={seq < 0 ? 0 : seq}
              aria-valuetext={seq >= 0 && events[seq] ? `${events[seq].type}: ${events[seq].label}` : "cursor parked"}
              className="hud-inset relative h-[26px] cursor-pointer touch-none select-none outline-none transition-shadow hover:shadow-[0_0_10px_rgba(45,217,236,0.15)] focus-visible:shadow-[0_0_10px_rgba(45,217,236,0.35)]"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverX(`${Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))}%`);
              }}
              onMouseLeave={() => setHoverX(null)}
              onClick={(e) => {
                if (events.length === 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                const idx = Math.round(frac * (events.length - 1));
                setPlaying(false);
                setSeq(idx);
                const ev = events[idx];
                if (ev?.type === "NAV" && ev.module) setModule(ev.module);
              }}
              onKeyDown={(e) => {
                if (events.length === 0) return;
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const delta = e.key === "ArrowRight" ? 1 : -1;
                  const next = Math.min(events.length - 1, Math.max(0, (seq < 0 ? -1 : seq) + delta));
                  setPlaying(false);
                  setSeq(next);
                  const ev = events[next];
                  if (ev?.type === "NAV" && ev.module) setModule(ev.module);
                }
              }}
            >
              {/* grid ticks */}
              <div
                className="absolute inset-0 opacity-40"
                style={{ backgroundImage: "repeating-linear-gradient(90deg,#1a2430 0 1px,transparent 1px 28px)" }}
              />
              {/* scrub hover guide */}
              {hoverX !== null && (
                <div
                  className="absolute inset-y-0 w-px bg-cy/40"
                  style={{ left: hoverX }}
                  aria-hidden="true"
                />
              )}
              {/* playback cursor */}
              {seq >= 0 && events[seq] && (
                <div
                  className="absolute inset-y-0 w-[2px] bg-cy shadow-[0_0_8px_#2dd9ec]"
                  style={{ left: `${(seq / Math.max(1, events.length - 1)) * 100}%` }}
                />
              )}
              {events.map((e, i) => {
                const maxT = Math.max(1, events[events.length - 1]?.t ?? 1);
                return (
                  <span
                    key={e.id}
                    className="absolute top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full transition-opacity"
                    style={{
                      left: `calc(${(Math.min(e.t, maxT) / maxT) * 94 + 3}% )`,
                      background: toneDot[REPLAY_TONE[e.type]],
                      boxShadow: `0 0 4px ${toneDot[REPLAY_TONE[e.type]]}`,
                      opacity: seq < 0 || i <= seq ? 1 : 0.25,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* type filters */}
          <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-1.5" role="group" aria-label="Filter journal by event type">
            {(["ALL", "NAV", "CMD", "ALERT", "SYS", "DATA"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={filter === t}
                onClick={() => setFilter(t)}
                className={cn(
                  "border px-1.5 py-[2px] text-[8px] font-extrabold uppercase tracking-[0.14em] transition-colors",
                  filter === t
                    ? "border-cy/60 bg-cy/10 text-cy"
                    : "border-line bg-transparent text-faint hover:text-dim"
                )}
              >
                {t === "ALL" ? "ALL" : TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {/* event list */}
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5" role="log" aria-label="Recorded mission events">
            {shown.length === 0 ? (
              <p className="px-2 py-6 text-center text-[9.5px] uppercase tracking-[0.16em] text-faint">
                TAPE EMPTY — OPERATE THE CONSOLE TO RECORD EVENTS
              </p>
            ) : (
              shown.map((e, idx) => {
                const globalIdx = events.indexOf(e);
                const isCursor = seq === globalIdx;
                const isPast = seq >= 0 && globalIdx <= seq;
                return (
                  <div
                    key={e.id}
                    data-idx={globalIdx}
                    className={cn(
                      "relative flex items-start gap-2 border-b border-line/40 px-2 py-[7px] transition-colors",
                      isCursor && "bg-cy/[0.08]",
                      !isCursor && isPast && seq >= 0 && "opacity-60"
                    )}
                  >
                    {isCursor && (
                      <span className="absolute inset-y-0 left-0 w-[2px] bg-cy shadow-[0_0_8px_#2dd9ec]" aria-hidden="true" />
                    )}
                    <span className="mt-[5px] shrink-0">
                      <Dot
                        tone={DOT_TONE[e.type]}
                        pulse={e.type === "ALERT"}
                        className={e.type === "SYS" ? "!bg-[#a78bfa]" : undefined}
                      />
                    </span>
                    <span className="mono-tabular mt-[2px] w-[74px] shrink-0 text-[8.5px] leading-tight text-faint">
                      {fmt.time(e.t).slice(5)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-[8px] font-black uppercase tracking-[0.14em]",
                            e.type === "ALERT" ? "text-rd" : e.type === "NAV" ? "text-cy" : e.type === "CMD" ? "text-gr" : e.type === "DATA" ? "text-am" : "text-[#a78bfa]"
                          )}
                        >
                          {TYPE_LABEL[e.type]}
                        </span>
                      </span>
                      <span className="block truncate text-[9.5px] font-bold uppercase tracking-[0.05em] text-ink/90">
                        {e.label}
                      </span>
                      {e.detail && (
                        <span className="mono-tabular block truncate text-[8.5px] text-dim">{e.detail}</span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* transport controls */}
          <footer className="flex items-center gap-1.5 border-t border-line px-2.5 py-2">
            <button
              type="button"
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                  return;
                }
                if (events.length === 0) {
                  toast({ title: "TAPE EMPTY", description: "No events recorded yet." });
                  return;
                }
                setSeq(seq >= events.length - 1 ? 0 : seq + 1);
                const first = useMission.getState().replayEvents[seq >= events.length - 1 ? 0 : seq + 1];
                if (first?.type === "NAV" && first.module) setModule(first.module);
                setPlaying(true);
              }}
              className="flex min-h-[26px] flex-1 items-center justify-center gap-1.5 border border-gr/50 bg-gr/10 px-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-gr transition-colors hover:bg-gr/20"
              aria-label={playing ? "Pause replay" : "Play replay from cursor"}
            >
              {playing ? <Pause className="size-3" aria-hidden="true" /> : <Play className="size-3" aria-hidden="true" />}
              {playing ? "HOLD" : "PLAY TAPE"}
            </button>
            <button
              type="button"
              onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
              className="flex min-h-[26px] items-center gap-1 border border-line px-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-dim transition-colors hover:border-cy/50 hover:text-cy"
              aria-label={`Playback speed ${speed}× — click to toggle`}
              title="Toggle playback speed"
            >
              <FastForward className="size-3" aria-hidden="true" />
              {speed}×
            </button>
            <button
              type="button"
              onClick={() => {
                clearReplay();
                eraseTapeStorage();
                setPlaying(false);
                setRestored(0);
                toast({ title: "TAPE ERASED", description: "Event journal cleared — recorder armed." });
              }}
              className="flex min-h-[26px] items-center gap-1 border border-line px-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-dim transition-colors hover:border-rd/50 hover:text-rd"
              aria-label="Erase replay tape"
            >
              <Trash2 className="size-3" aria-hidden="true" />
              ERASE
            </button>
          </footer>
          </aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
