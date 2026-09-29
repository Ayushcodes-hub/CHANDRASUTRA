"use client";

/**
 * LUNARMATCH 2.0 — high-rate downlink queue visualizer with QoS classes.
 * Products flow over the KA-BAND pipe (96 Mbps nominal, degraded during
 * DSN handover). HIGH preempts (2× share), NORM standard, LOW bulk.
 * Operator exports enqueue as HIGH at the tail of the queue.
 */
import * as React from "react";
import { useMission, type DlPriority } from "@/lib/mission-store";
import { Lbl } from "@/components/hud/primitives";

const KIND_TONE: Record<string, string> = {
  TIFF: "text-cy border-cy/30",
  GEOTIFF: "text-cy border-cy/30",
  IMG: "text-gr border-gr/30",
  CUBE: "text-vi border-vi/30",
  LAS: "text-am border-am/30",
  CSV: "text-dim border-line2",
  XML: "text-gr border-gr/30",
  JSON: "text-dim border-line2",
};

const PRIO_STYLE: Record<DlPriority, { badge: string; label: string; glow: string | null }> = {
  HIGH: { badge: "text-am border-am/50 bg-am/10", label: "H", glow: "rgba(255,180,84,0.55)" },
  NORM: { badge: "text-cy border-cy/40 bg-cy/5", label: "N", glow: null },
  LOW: { badge: "text-faint border-line2", label: "L", glow: null },
};

export function DownlinkQueue() {
  const items = useMission((s) => s.downlink);
  const done = useMission((s) => s.downlinkDone);
  const handoverActive = useMission((s) => s.handoverActive);
  const rate = handoverActive ? 8 : 96; // Mbps nominal label
  const highCount = items.filter((i) => i.prio === "HIGH").length;

  /* display in transmission order (HIGH first) */
  const ordered = React.useMemo(
    () => [...items].sort((a, b) => (a.prio === b.prio ? b.sent / b.sizeMb - a.sent / a.sizeMb : a.prio === "HIGH" ? -1 : b.prio === "HIGH" ? 1 : a.prio === "NORM" ? -1 : 1)),
    [items]
  );

  return (
    <div className="hud-inset p-2.5">
      <div className="flex items-center justify-between mb-2">
        <Lbl className="text-dim">DOWNLINK QUEUE</Lbl>
        <span className={`text-[8.5px] font-extrabold mono-tabular ${handoverActive ? "text-am" : "text-gr"}`}>
          {handoverActive ? "8" : rate} <span className="text-faint font-bold">MBPS</span>
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-2.5 text-center" role="status">
          <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-gr/80">QUEUE NOMINAL</div>
          <div className="text-[7.5px] uppercase tracking-[0.1em] text-faint mt-0.5">NO PENDING PRODUCTS · PIPE IDLE</div>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {ordered.map((it) => {
            const pct = Math.min(100, (it.sent / it.sizeMb) * 100);
            const p = PRIO_STYLE[it.prio];
            return (
              <li key={it.id} className="dl-item bg-[#0a0f16] border border-line rounded-[2px] px-1.5 py-1.5">
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="flex min-w-0 items-center gap-1">
                    <span
                      className={`shrink-0 border px-[3px] text-[7px] font-black leading-[11px] rounded-[2px] ${p.badge}`}
                      title={`QoS ${it.prio} — ${it.prio === "HIGH" ? "preempt 2× pipe share" : it.prio === "NORM" ? "standard 1× share" : "bulk 0.55× share"}`}
                    >
                      {p.label}
                    </span>
                    <span className="text-[8.5px] font-bold tracking-[0.04em] text-ink/85 truncate min-w-0">{it.label}</span>
                  </span>
                  <span className={`shrink-0 text-[7px] font-extrabold px-1 py-px border rounded-[2px] tracking-[0.1em] ${KIND_TONE[it.kind] ?? "text-dim border-line2"}`}>
                    {it.kind}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-[3px] flex-1 bg-[#141c26] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                      style={{
                        width: `${pct}%`,
                        background:
                          handoverActive
                            ? "linear-gradient(90deg,#ffb454,#ff8a4c)"
                            : it.prio === "HIGH"
                              ? "linear-gradient(90deg,#d97706,#ffb454)"
                              : "linear-gradient(90deg,#0e7490,#2dd9ec)",
                        boxShadow: handoverActive ? "0 0 6px #ffb45488" : (p.glow ? `0 0 6px ${p.glow}` : "0 0 6px #2dd9ec66"),
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[7.5px] font-bold mono-tabular text-dim w-[52px] text-right">
                    {it.sent.toFixed(0)}/{it.sizeMb.toFixed(0)}MB
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between text-[8px] uppercase tracking-[0.1em] pt-1.5 border-t border-line/60">
        <span className="text-faint">
          PRODUCTS DOWNLINKED {highCount > 0 && <span className="text-am font-bold">· {highCount} PREEMPT</span>}
        </span>
        <span className="font-extrabold mono-tabular text-gr">+{String(done).padStart(3, "0")}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[7px] uppercase tracking-[0.08em] text-faint" aria-label="QoS class legend">
        <span className="font-black text-am">H</span> PREEMPT 2×
        <span className="text-line2">·</span>
        <span className="font-black text-cy">N</span> STD 1×
        <span className="text-line2">·</span>
        <span className="font-black text-dim">L</span> BULK 0.55×
      </div>
    </div>
  );
}
