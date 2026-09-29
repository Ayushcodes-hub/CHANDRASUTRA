"use client";

/**
 * LUNARMATCH 2.0 — ROVER TRAVERSE SIMULATOR
 * Simulates a hopper-rover descent along Transect A→B across Shackleton:
 * distance/velocity integration, slope gates, PSR entry, abort logic.
 */
import * as React from "react";
import { Panel, Chip, Lbl, Bar, Btn, Dot } from "@/components/hud/primitives";
import { Play, Square, RotateCcw, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMission } from "@/lib/mission-store";

/* sampled rim→floor→rim profile (km, meters) — mirrors TransectProfile data */
const PROFILE: [number, number][] = [
  [0, 980], [0.8, 1060], [1.4, 1120], [2, 1085], [2.6, 990], [3.4, 700],
  [4.2, 260], [5, -320], [5.8, -900], [6.6, -1480], [7.4, -2010], [8.4, -2520],
  [9.4, -2940], [10.4, -3260], [11.4, -3520], [12.4, -3740], [13.4, -3900],
  [14.6, -4060], [15.8, -4180], [17, -4260], [18.2, -4280], [19, -4120],
  [19.6, -3600], [20, -2810], [20.4, -1700], [20.7, -420], [20.9, 380], [21, 980],
];

const SLOPE_AT = (km: number): number => {
  const i = Math.min(PROFILE.length - 2, Math.max(0, PROFILE.findIndex((p) => p[0] >= km)));
  const [k0, e0] = PROFILE[i];
  const [k1, e1] = PROFILE[i + 1];
  if (k1 === k0) return 0;
  return (Math.atan2(Math.abs(e1 - e0), (k1 - k0) * 1000) * 180) / Math.PI;
};

const ELEV_AT = (km: number): number => {
  const i = Math.min(PROFILE.length - 2, Math.max(0, PROFILE.findIndex((p) => p[0] >= km)));
  const [k0, e0] = PROFILE[i];
  const [k1, e1] = PROFILE[i + 1];
  const t = k1 === k0 ? 0 : (km - k0) / (k1 - k0);
  return e0 + t * (e1 - e0);
};

const MAX_SLOPE_GATE = 32; // degrees — beyond this the wheeled rover aborts
const TOTAL_KM = 21;
const MAX_SPEED = 0.026; // km per tick (~1.6 km/h scaled)

type Phase = "IDLE" | "RUN" | "ABORT" | "DONE";

export function RoverSim() {
  const [phase, setPhase] = React.useState<Phase>("IDLE");
  const [km, setKm] = React.useState(0);
  const [power, setPower] = React.useState(100);
  const [science, setScience] = React.useState(0);
  const [hist, setHist] = React.useState<{ slope: number; power: number }[]>([]);
  const { toast } = useToast();
  const raf = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const kmRef = React.useRef(0);
  const powerRef = React.useRef(100);

  React.useEffect(() => {
    kmRef.current = km;
  }, [km]);

  /* live bridge → hypsometric map overlay (Elevation center viewport) */
  React.useEffect(() => {
    useMission.getState().setRover(km, phase);
  }, [km, phase]);
  React.useEffect(() => {
    return () => useMission.getState().setRover(null, "IDLE"); // clear map marker on unmount
  }, []);

  const stop = React.useCallback(() => {
    if (raf.current) clearInterval(raf.current);
    raf.current = null;
  }, []);

  const start = () => {
    stop();
    setPhase("RUN");
    setKm(0);
    setPower(100);
    setScience(0);
    setHist([]);
    kmRef.current = 0;
    powerRef.current = 100;
    raf.current = setInterval(() => {
      const prev = kmRef.current;
      const slope = SLOPE_AT(prev);
      const speed = MAX_SPEED * (slope > 24 ? 0.45 : slope > 15 ? 0.7 : 1);
      const next = prev + speed;

      if (slope > MAX_SLOPE_GATE) {
        stop();
        setPhase("ABORT");
        toast({
          title: "⚠ ROVER ABORT",
          description: `Slope ${slope.toFixed(1)}° exceeds ${MAX_SLOPE_GATE}° wheeled limit at km ${prev.toFixed(1)} — hopper mode required.`,
        });
        window.dispatchEvent(
          new CustomEvent("lm:alert", {
            detail: { title: "ROVER ABORT", body: `Transect A-B halted at km ${prev.toFixed(2)} — ${slope.toFixed(1)}° wall exceeds rated gate.` },
          })
        );
        return;
      }
      if (next >= TOTAL_KM) {
        stop();
        kmRef.current = TOTAL_KM;
        setKm(TOTAL_KM);
        setPhase("DONE");
        toast({ title: "ROVER COMPLETE", description: "Transect A→B traversed — 21.0 km, full science package returned." });
        return;
      }
      kmRef.current = next;
      setKm(next);
      const powerNext = Math.max(8, powerRef.current - 0.09 - slope * 0.004);
      powerRef.current = powerNext;
      setPower(powerNext);
      setHist((h) => [...h.slice(-69), { slope: Math.min(slope, 40), power: powerNext }]);
      setScience((s) => (ELEV_AT(prev) < -2000 ? s + 0.5 : s + 0.14));
    }, 110);
  };

  React.useEffect(() => stop, [stop]);

  const slope = SLOPE_AT(km);
  const elev = ELEV_AT(km);
  const inPsr = elev < -2000;
  const pct = (km / TOTAL_KM) * 100;

  const phaseChip = {
    IDLE: <Chip tone="dim">STANDBY</Chip>,
    RUN: <Chip tone="gr" dot>TRAVERSING</Chip>,
    ABORT: <Chip tone="rd" dot>ABORTED</Chip>,
    DONE: <Chip tone="cy">COMPLETE</Chip>,
  }[phase];

  return (
    <Panel
      title={
        <span className="flex items-center gap-1.5">
          <Bot className="size-3 text-vi" /> ROVER TRAVERSE SIM
        </span>
      }
      right={phaseChip}
      accent="vi"
    >
      {/* path visualization */}
      <div className="hud-inset relative mb-2 h-[54px] overflow-hidden">
        <svg viewBox="0 0 210 54" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          {PROFILE.slice(0, -1).map((p, i) => {
            const q = PROFILE[i + 1];
            const y = (m: number) => 8 + ((2000 - m) / 6200) * 38;
            return <line key={i} x1={p[0] * 10} y1={y(p[1])} x2={q[0] * 10} y2={y(q[1])} stroke="#263342" strokeWidth="1.2" />;
          })}
          {PROFILE.slice(0, -1).map((p, i) => {
            const q = PROFILE[i + 1];
            const y = (m: number) => 8 + ((2000 - m) / 6200) * 38;
            return p[1] < -2000 ? (
              <line key={`psr-${i}`} x1={p[0] * 10} y1={y(p[1])} x2={q[0] * 10} y2={y(q[1])} stroke="#548cff" strokeWidth="1.2" opacity="0.5" />
            ) : null;
          })}
        </svg>
        {/* rover marker */}
        <div
          className="absolute h-[7px] w-[7px] transition-[left,top] duration-100 ease-linear"
          style={{ left: `calc(${(km / TOTAL_KM) * 100}% - 3px)`, top: `${8 + ((2000 - elev) / 6200) * 38}%` }}
        >
          <span className={`block size-[7px] rounded-full ${phase === "ABORT" ? "bg-rd" : "bg-gr"}`} style={{ boxShadow: "0 0 8px currentColor" }} />
        </div>
        <span className="absolute left-1 top-1 text-[7px] uppercase tracking-[0.15em] text-faint">A</span>
        <span className="absolute right-1 top-1 text-[7px] uppercase tracking-[0.15em] text-faint">B · 21.0 KM</span>
      </div>

      {/* live telemetry sparkline — slope vs power rolling window */}
      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between">
          <Lbl>LIVE TELEMETRY · 70-TICK WINDOW</Lbl>
          <span className="flex items-center gap-2 text-[7.5px] font-bold uppercase tracking-[0.12em]">
            <span className="flex items-center gap-1 text-am"><span className="inline-block h-px w-2.5 bg-am" aria-hidden="true" />SLOPE</span>
            <span className="flex items-center gap-1 text-gr"><span className="inline-block h-px w-2.5 bg-gr" aria-hidden="true" />POWER</span>
          </span>
        </div>
        <div className="hud-inset relative h-[46px]">
          <svg viewBox="0 0 210 46" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {/* abort gate at 32° */}
            <line x1="0" y1={46 - (32 / 40) * 42} x2="210" y2={46 - (32 / 40) * 42} stroke="#ff5d5d" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.55" />
            {/* power series */}
            <polyline
              points={hist.map((p, i) => `${(i / Math.max(1, hist.length - 1)) * 210},${46 - (p.power / 100) * 42}`).join(" ")}
              fill="none" stroke="#46e08f" strokeWidth="1.1" opacity="0.9"
              style={{ filter: "drop-shadow(0 0 2px #46e08f66)" }}
            />
            {/* slope series */}
            <polyline
              points={hist.map((p, i) => `${(i / Math.max(1, hist.length - 1)) * 210},${46 - (p.slope / 40) * 42}`).join(" ")}
              fill="none" stroke="#ffb454" strokeWidth="1.2"
              style={{ filter: "drop-shadow(0 0 2px #ffb45466)" }}
            />
          </svg>
          {hist.length === 0 && (
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold uppercase tracking-[0.18em] text-faint/70">
              NO SAMPLES · LAUNCH ROVER TO STREAM
            </span>
          )}
        </div>
      </div>

      {/* live telemetry */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="hud-inset px-1.5 py-1.5">
          <Lbl className="block text-[7px]">DIST</Lbl>
          <div className="text-[12px] font-extrabold mono-tabular text-ink">{km.toFixed(2)}<span className="text-[7.5px] text-faint"> KM</span></div>
        </div>
        <div className="hud-inset px-1.5 py-1.5">
          <Lbl className="block text-[7px]">SLOPE</Lbl>
          <div className={`text-[12px] font-extrabold mono-tabular ${slope > MAX_SLOPE_GATE ? "text-rd" : slope > 24 ? "text-am" : "text-gr"}`}>
            {slope.toFixed(1)}°
          </div>
        </div>
        <div className="hud-inset px-1.5 py-1.5">
          <Lbl className="block text-[7px]">ELEV</Lbl>
          <div className="text-[12px] font-extrabold mono-tabular text-cy">{elev >= 0 ? "+" : ""}{Math.round(elev)}m</div>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <Lbl>PROGRESS</Lbl>
          <span className="text-[9px] font-bold mono-tabular text-dim">{pct.toFixed(1)}%</span>
        </div>
        <Bar pct={pct} tone={phase === "ABORT" ? "rd" : "cy-gr"} segments={21} />
        <div className="flex items-center justify-between">
          <Lbl>BATTERY</Lbl>
          <span className={`text-[9px] font-bold mono-tabular ${power < 25 ? "text-rd" : "text-dim"}`}>{power.toFixed(0)}%</span>
        </div>
        <Bar pct={power} tone={power < 25 ? "rd" : "gr"} glow={power >= 25} />
        <div className="flex items-center justify-between">
          <Lbl>SCIENCE YIELD {inPsr && <span className="text-[#548cff]">· PSR + ICE</span>}</Lbl>
          <span className="text-[9px] font-bold mono-tabular text-am">{science.toFixed(1)} u</span>
        </div>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        {phase === "RUN" ? (
          <Btn icon={<Square className="size-3" />} onClick={() => { stop(); setPhase("IDLE"); }} full>
            HOLD
          </Btn>
        ) : (
          <Btn icon={<Play className="size-3" />} variant={phase === "DONE" ? "default" : "accent"} onClick={start} full>
            {phase === "ABORT" ? "RETRY SIM" : phase === "DONE" ? "RE-RUN" : "LAUNCH ROVER"}
          </Btn>
        )}
        <Btn
          icon={<RotateCcw className="size-3" />}
          onClick={() => { stop(); setPhase("IDLE"); setKm(0); setPower(100); setScience(0); setHist([]); }}
          title="Reset simulator"
        >
          <span className="sr-only">Reset</span>
        </Btn>
      </div>
      {phase === "ABORT" && (
        <p className="mt-2 flex items-start gap-1.5 text-[9px] leading-relaxed text-rd/90">
          <Dot tone="rd" /> WALL GATE HIT — switch architecture to tethered rappel or hopper thrust.
        </p>
      )}
    </Panel>
  );
}
