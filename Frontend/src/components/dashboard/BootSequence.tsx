"use client";

/**
 * LUNARMATCH 2.0 — boot sequence overlay (deep space network handshake)
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const BOOT_LINES = [
  "DSN GOLDSTONE 34M ............ HANDSHAKE OK",
  "UPLINK CARRIER 7165.2 MHz .... COHERENT",
  "EPHEMERIS STATE VECTOR ....... REV 4,412",
  "TMC-2 STEREO BANK ............ NOMINAL",
  "OHRC ULTRA-HIGH RES .......... STANDBY",
  "LOLA ALT 1400HZ .............. SYNC LOCK",
  "MAGSAC++ SOLVER .............. ARMED",
  "ORBITAL REGISTRATION ......... PASS #0482-S",
];

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [n, setN] = React.useState(0);
  const [fading, setFading] = React.useState(false);

  React.useEffect(() => {
    if (n < BOOT_LINES.length) {
      const t = setTimeout(() => setN((v) => v + 1), n === 0 ? 320 : 170 + Math.random() * 130);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setFading(true), 420);
    const t2 = setTimeout(onDone, 980);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [n, onDone]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-void transition-opacity duration-500",
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <div className="space-nebula" />
      <div className="relative w-[min(92vw,560px)]">
        <div className="flex items-center gap-3 mb-5">
          <svg width="44" height="44" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r="8.5" fill="none" stroke="#2dd9ec" strokeWidth="1.6" style={{ filter: "drop-shadow(0 0 6px #2dd9ec)" }} />
            <ellipse cx="17" cy="17" rx="14.5" ry="5" fill="none" stroke="#46e08f" strokeWidth="1" transform="rotate(-24 17 17)" />
            <circle cx="29" cy="10.6" r="1.9" fill="#46e08f" />
          </svg>
          <div>
            <div className="font-display font-bold text-[24px] tracking-[0.1em] text-ink leading-none">
              LUNARMATCH <span className="text-cy text-glow-cy">2.0</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-faint mt-1.5">DEEP SPACE LINK ESTABLISHING…</div>
          </div>
        </div>
        <div className="hud-panel p-4 min-h-[228px]">
          {BOOT_LINES.slice(0, n).map((l, i) => (
            <div key={i} className="flex items-center gap-2 py-[3px] text-[10.5px] tracking-[0.06em] rise-in">
              <span className="text-gr">✔</span>
              <span className="text-dim">{l}</span>
            </div>
          ))}
          <span className="caret text-cy text-[10.5px]" />
        </div>
        <div className="mt-3 h-[3px] w-full bg-[#10161f] overflow-hidden rounded-full">
          <div
            className="h-full bg-gradient-to-r from-cydim via-cy to-gr transition-[width] duration-200"
            style={{ width: `${(n / BOOT_LINES.length) * 100}%`, boxShadow: "0 0 10px #2dd9ec88" }}
          />
        </div>
      </div>
    </div>
  );
}
