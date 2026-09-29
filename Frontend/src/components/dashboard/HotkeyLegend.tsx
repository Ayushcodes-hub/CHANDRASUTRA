"use client";

/**
 * LUNARMATCH 2.0 — OPERATOR HOTKEY LEGEND
 * Press ? (shift + /) anywhere to surface the full console keybind map.
 * HUD-styled overlay: grouped keycaps with amber key chips + action labels.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { useMission } from "@/lib/mission-store";
import { Lbl, Chip } from "@/components/hud/primitives";
import { cn } from "@/lib/utils";

function Keycap({ k, wide }: { k: string; wide?: boolean }) {
  return (
    <kbd
      aria-hidden="true"
      className={cn(
        "inline-flex h-[22px] items-center justify-center rounded-[3px] border border-line2 border-b-2 bg-[#0d131c] px-1.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-am shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.5)]",
        wide ? "min-w-[52px]" : "min-w-[26px]"
      )}
    >
      {k}
    </kbd>
  );
}

function Row({ keys, wide, label, hint }: { keys: string[]; wide?: boolean; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line/40 px-3 py-[7px] last:border-b-0">
      <span className="flex w-[92px] shrink-0 gap-1">
        {keys.map((k) => (
          <Keycap key={k} k={k} wide={wide} />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink/90">{label}</span>
        {hint && <span className="mono-tabular block truncate text-[8.5px] text-faint">{hint}</span>}
      </span>
    </div>
  );
}

export function HotkeyLegend() {
  const open = useMission((s) => s.legendOpen);
  const setOpen = useMission((s) => s.setLegendOpen);

  /* ? opens the legend — works even while other overlays are up */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen(!useMission.getState().legendOpen);
      } else if (e.key === "Escape" && useMission.getState().legendOpen) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-[3px] p-3"
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Operator hotkey legend"
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="hud-panel corners w-full max-w-[560px] max-h-[86vh] overflow-y-auto bg-[#0a0e14] shadow-[0_0_70px_rgba(45,217,236,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="corner-b" aria-hidden="true" />

            {/* header */}
            <header className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Keyboard className="size-[15px] shrink-0 text-cy" aria-hidden="true" />
                <h2 className="truncate text-[10px] font-extrabold uppercase tracking-[0.2em] text-cy text-glow-cy">
                  Operator Hotkey Legend
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <Chip tone="gr" dot>FLIGHT COMPUTER</Chip>
                <button
                  type="button"
                  aria-label="Close hotkey legend"
                  onClick={() => setOpen(false)}
                  className="rounded-[2px] border border-line p-1 text-dim transition-colors hover:border-rd/60 hover:text-rd"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* module navigation */}
            <div className="px-3.5 pt-3 pb-1">
              <Lbl className="text-dim">MODULE NAVIGATION</Lbl>
            </div>
            <div className="px-2 pb-1">
              <Row keys={["1"]} label="ORBITAL REGISTRATION" hint="GOTO MODULE 01/5" />
              <Row keys={["2"]} label="3D DEM SYNTHESIS" hint="GOTO MODULE 02/5" />
              <Row keys={["3"]} label="PHOTOMETRIC LAB" hint="GOTO MODULE 03/5" />
              <Row keys={["4"]} label="ELEVATION PROFILES" hint="GOTO MODULE 04/5" />
              <Row keys={["5"]} label="TELEMETRY ARCHIVE" hint="GOTO MODULE 05/5" />
            </div>

            {/* console actions */}
            <div className="px-3.5 pt-2.5 pb-1">
              <Lbl className="text-dim">CONSOLE ACTIONS</Lbl>
            </div>
            <div className="px-2 pb-1">
              <Row keys={["⌘", "K"]} label="MISSION COMMAND CONSOLE" hint="OPERATOR PALETTE — GOTO / EXPORT / FX" wide />
              <Row keys={["F1"]} label="WIREFRAME MODE" hint="TOGGLE MESH RENDER STYLE" />
              <Row keys={["F2"]} label="INVERT SUN VECTOR" hint="SOLAR INCIDENCE 180° FLIP" />
              <Row keys={["F6"]} label="MISSION REPLAY TAPE" hint="EVENT JOURNAL DRAWER + PLAYBACK" />
              <Row keys={["A"]} label="ALERT HISTORY TRIAGE" hint="SEVERITY TIMELINE · ANOMALY BUFFER" />
              <Row keys={["ESC"]} label="RESET CAMERA RIG" hint="NADIR RE-CENTER · CLOSE OVERLAYS" />
              <Row keys={["?"]} label="THIS LEGEND" hint="FULL KEYBIND MAP" />
            </div>

            {/* viewport */}
            <div className="px-3.5 pt-2.5 pb-1">
              <Lbl className="text-dim">3D VIEWPORT</Lbl>
            </div>
            <div className="px-2 pb-2">
              <Row keys={["DRG"]} label="ORBIT CAMERA" hint="LEFT-DRAG THE TERRAIN STAGE" wide />
              <Row keys={["WHL"]} label="ZOOM DOLLY" hint="MOUSE WHEEL — 8..28 U RIG DISTANCE" wide />
            </div>

            {/* footer */}
            <footer className="flex items-center justify-between border-t border-line px-3.5 py-2">
              <span className="text-[8.5px] uppercase tracking-[0.16em] text-faint">
                DSN::ORB-4 · KEYMAP REV 2.0.4
              </span>
              <span className="flex items-center gap-1.5 text-[8.5px] uppercase tracking-[0.16em] text-gr">
                <span className="inline-block size-[5px] rounded-full bg-gr animate-pulse-dot" />
                ? TO TOGGLE
              </span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
