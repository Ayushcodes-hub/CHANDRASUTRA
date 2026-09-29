"use client";

/**
 * LUNARMATCH 2.0 — MODULE SWITCH STINGER
 * A 900ms channel-change wipe across the stage seam whenever the operator
 * jumps modules: diagonal light sweep + "SW ▸ 03 PHOTOMETRIC LAB" tag.
 * Skipped during boot and replay re-enactment; honors reduced motion.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMission } from "@/lib/mission-store";
import { MODULES } from "@/lib/mission-data";

export function ModuleStinger() {
  const mod = useMission((s) => s.module);
  const booted = useMission((s) => s.booted);
  const replaySeq = useMission((s) => s.replaySeq);
  const [sting, setSting] = React.useState<{ id: number; mod: string; replay: boolean } | null>(null);
  const prev = React.useRef(mod);
  const first = React.useRef(true);
  const seq = React.useRef(0);

  React.useEffect(() => {
    if (!booted) return;
    if (first.current) {
      first.current = false;
      prev.current = mod;
      return;
    }
    if (prev.current === mod) return;
    prev.current = mod;
    const isReplay = replaySeq >= 0;
    setSting({ id: ++seq.current, mod, replay: isReplay });
    const t = setTimeout(() => setSting(null), 950);
    return () => clearTimeout(t);
  }, [mod, booted, replaySeq]);

  const idx = sting ? MODULES.findIndex((m) => m.id === sting.mod) : -1;
  const label = idx >= 0 ? MODULES[idx].label : "";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[64px] z-[60] flex justify-center" aria-hidden="true">
      <AnimatePresence>
        {sting && (
          <motion.div
            key={sting.id}
            initial={{ opacity: 0, y: -10, scaleX: 0.85 }}
            animate={{ opacity: 1, y: 0, scaleX: 1 }}
            exit={{ opacity: 0, y: 6, scaleX: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="stinger-plate relative overflow-hidden rounded-[3px] border border-cy/40 bg-[#06121a]/92 px-4 py-1.5 shadow-[0_0_36px_rgba(45,217,236,0.25)]"
          >
            {/* light sweep */}
            <span className="stinger-sweep" />
            {/* edge rails */}
            <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-transparent via-cy/70 to-transparent" />
            <span className="pointer-events-none absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-transparent via-cy/70 to-transparent" />
            <div className="flex items-center gap-2.5 font-mono">
              <span className="text-[8px] font-black uppercase tracking-[0.22em] text-am">
                {sting.replay ? "REPLAY SW" : "MODULE SW"}
              </span>
              <span className="h-3 w-px bg-line2" aria-hidden="true" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cy text-glow-cy">
                {String(idx + 1).padStart(2, "0")} · {label}
              </span>
              <span className="h-3 w-px bg-line2" aria-hidden="true" />
              <span className="flex items-center gap-1">
                <span className="inline-block size-[4px] rounded-full bg-gr animate-pulse-dot" />
                <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-gr">LINK STABLE</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
