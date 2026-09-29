"use client";

/**
 * LUNARMATCH 2.0 — top command bar: wordmark, module nav, link status
 */
import * as React from "react";
import { MODULES, MISSION } from "@/lib/mission-data";
import { useMission, fmt } from "@/lib/mission-store";
import { Dot, Chip } from "@/components/hud/primitives";
import { SunDial } from "@/components/dashboard/SunDial";

function WordmarkIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0">
      <circle cx="17" cy="17" r="8.5" fill="none" stroke="#2dd9ec" strokeWidth="1.6" style={{ filter: "drop-shadow(0 0 4px #2dd9ec88)" }} />
      <ellipse cx="17" cy="17" rx="14.5" ry="5" fill="none" stroke="#46e08f" strokeWidth="1" transform="rotate(-24 17 17)" opacity="0.9" />
      <circle cx="29" cy="10.6" r="1.9" fill="#46e08f" style={{ filter: "drop-shadow(0 0 3px #46e08f)" }} />
      <circle cx="17" cy="17" r="2.1" fill="#0b1017" stroke="#2dd9ec" strokeWidth="0.8" />
      <path d="M13 15a5.5 5.5 0 0 0 7 5" fill="none" stroke="#7f93a8" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

export function TopBar() {
  const mod = useMission((s) => s.module);
  const setModule = useMission((s) => s.setModule);
  const live = useMission((s) => s.live);

  return (
    <>
      <header className="relative z-30 flex items-stretch justify-between gap-2 border-b border-line bg-[#05080d]/95 backdrop-blur px-2 sm:px-3 h-[56px] shrink-0">
        {/* cyan glow seam under the header */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cy/40 to-transparent"
        />
        {/* wordmark */}
      <div className="flex items-center gap-2.5 min-w-0">
        <WordmarkIcon />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-[17px] sm:text-[19px] tracking-[0.08em] text-ink leading-none whitespace-nowrap">
              LUNARMATCH <span className="text-cy text-glow-cy">2.0</span>
            </span>
            <span className="hidden min-w-0 max-w-[200px] truncate text-[8.5px] uppercase tracking-[0.14em] text-faint leading-tight md:block">
              {"// DEEP-SPACE TELEMETRY & MULTI-MODAL REGISTRATION"}
            </span>
          </div>
          <div className="mt-1 hidden sm:flex">
            <Chip tone="gr" dot>
              {MISSION.network} <span className="text-faint px-0.5">|</span> {MISSION.orbit}
            </Chip>
          </div>
        </div>
      </div>

      {/* module nav */}
      <nav aria-label="Console modules" className="hidden lg:flex shrink-0 items-stretch gap-1 my-1.5">
        {MODULES.map((m) => {
          const active = mod === m.id;
          const words = m.label.split(" ");
          return (
            <button
              key={m.id}
              type="button"
              aria-current={active ? "page" : undefined}
              title={`${m.label} — press ${MODULES.indexOf(m) + 1}`}
              onClick={() => setModule(m.id)}
              className={`relative overflow-hidden px-3 text-left text-[10px] font-extrabold uppercase tracking-[0.1em] leading-[1.3] rounded-[3px] transition-all duration-200 flex flex-col justify-center border ${
                active
                  ? "bg-gradient-to-b from-[#41e3f5] to-[#1cc0dc] border-[#55e7f6] text-[#05272e] shadow-[0_0_18px_rgba(45,217,236,0.45)]"
                  : "border-transparent text-dim hover:text-ink hover:bg-raise"
              }`}
            >
              <span className="whitespace-nowrap">
                {words[0]} {words[1]}
              </span>
              {words[2] && <span className="whitespace-nowrap">{words.slice(2).join(" ")}</span>}
              {active && (
                <>
                  <span className="absolute -top-[5px] right-1 text-[6.5px] font-black tracking-[0.18em] opacity-90">(ACTIVE)</span>
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* link status */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <SunDial />
        <div className="hidden md:flex flex-col justify-center hud-inset px-2.5 py-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <Dot tone="gr" />
            <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-gr">SYNC: LOCKED</span>
          </div>
          <div className="text-[13px] font-extrabold mono-tabular text-ink">{live.sync.toFixed(1)}%</div>
        </div>
        <div className="hidden sm:flex flex-col justify-center hud-inset px-2.5 py-1 leading-tight">
          <div className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-am">FPS: {Math.round(live.fps)}</div>
          <div className="text-[13px] font-extrabold mono-tabular text-ink/85">[{Math.round(live.frameMs)}ms]</div>
        </div>
        <div className="hidden xl:flex flex-col justify-center hud-inset px-2.5 py-1 leading-tight">
          <div className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-faint">MET</div>
          <div className="text-[13px] font-extrabold mono-tabular text-cy">{fmt.time(live.met)}</div>
        </div>
        <button
          type="button"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          aria-label="Open command console"
          title="Command console — ⌘K"
          className="hidden md:flex flex-col justify-center hud-inset px-2.5 py-1 leading-tight hover:border-cy/50 transition-colors group"
        >
          <div className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-faint group-hover:text-cy transition-colors">COMMAND</div>
          <div className="text-[11px] font-extrabold mono-tabular text-dim group-hover:text-ink transition-colors">⌘K</div>
        </button>
        <button
          type="button"
          aria-label="Operator profile"
          className="relative size-9 rounded-full border border-line2 bg-raise flex items-center justify-center hover:border-cy/60 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7f93a8" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-gr animate-pulse-dot" aria-hidden="true" />
        </button>
      </div>
      </header>

      {/* mobile / tablet module switcher — nav collapses below lg */}
      <nav
        aria-label="Console modules (compact)"
        className="lg:hidden relative z-20 flex items-stretch gap-1 border-b border-line bg-[#05080d]/95 backdrop-blur px-1.5 py-1.5 overflow-x-auto lm-no-scrollbar shrink-0"
      >
        {MODULES.map((m, i) => {
          const active = mod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setModule(m.id)}
              className={`relative shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] border text-left transition-all duration-200 overflow-hidden ${
                active
                  ? "bg-gradient-to-b from-[#41e3f5] to-[#1cc0dc] border-[#55e7f6] text-[#05272e] shadow-[0_0_14px_rgba(45,217,236,0.4)]"
                  : "border-line bg-[#0a0f16] text-dim hover:text-ink hover:border-line2"
              }`}
            >
              <span
                className={`mono-tabular text-[8px] font-black tracking-[0.08em] ${
                  active ? "text-[#05272e]/70" : "text-faint"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] whitespace-nowrap">{m.label}</span>
              {active && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
