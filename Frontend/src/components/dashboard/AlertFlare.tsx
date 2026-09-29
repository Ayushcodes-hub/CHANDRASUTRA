"use client";

/**
 * LUNARMATCH 2.0 — alert flare overlay
 * Listens for "lm:alert" CustomEvents (detail: {title, body}) and pulses the
 * screen edges red, plus auto-fires a random ops anomaly every ~90–150 s.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { useMission, classifyAlert, fmt } from "@/lib/mission-store";
import { useToast } from "@/hooks/use-toast";

const ANOMALIES = [
  { title: "DSN ANOMALY", body: "Goldstone 34M carrier drift +1.9 Hz — Doppler resync engaged." },
  { title: "PSR ALERT", body: "ShadowCam exposure saturating in crater bowl — ND gain stepped −0.4." },
  { title: "EPHEMERIS", body: "Orbit state vector revision 4,413 uploaded — convergence re-armed." },
  { title: "THERMAL", body: "OHRC focal-plane at +42.1 °C — radiator slew scheduled next eclipse." },
  { title: "SIGNAL FADE", body: "Ka-band link margin −2.8 dB during limb graze — buffering to 64 MB." },
];

export function AlertFlare() {
  const [active, setActive] = React.useState<{ title: string; body: string; met: number } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const fire = React.useCallback(
    (a: { title: string; body: string }) => {
      setActive({ ...a, met: useMission.getState().live.met });
      toast({ title: `⚠ ${a.title}`, description: a.body });
      useMission.getState().logEvent("ALERT", a.title.toUpperCase(), a.body.slice(0, 56));
      useMission.getState().logAlert(a.title, a.body); // archive to triage drawer
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(null), 5200);
    },
    [toast]
  );

  React.useEffect(() => {
    const onAlert = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.title) fire({ title: d.title, body: d.body ?? "" });
    };
    window.addEventListener("lm:alert", onAlert);

    let anomalyTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      anomalyTimer = setTimeout(() => {
        if (!document.hidden && consoleMounted()) fire(ANOMALIES[Math.floor(Math.random() * ANOMALIES.length)]);
        schedule();
      }, 90000 + Math.random() * 60000);
    };
    schedule();

    return () => {
      window.removeEventListener("lm:alert", onAlert);
      clearTimeout(anomalyTimer);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fire]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-[90] transition-opacity duration-700",
        active ? "opacity-100" : "opacity-0"
      )}
    >
      {/* edge glow */}
      <div
        className="absolute inset-0 alert-flare-glow"
        style={{
          boxShadow: "inset 0 0 90px rgba(255,93,93,0.34), inset 0 0 220px rgba(255,93,93,0.16)",
          animation: "alertPulse 1.3s ease-in-out 3",
        }}
      />
      {/* banner */}
      <div className="absolute left-1/2 top-14 -translate-x-1/2 rise-in">
        <div className="hud-panel flex items-center gap-3 border-rd/50 px-4 py-2.5 shadow-[0_0_40px_rgba(255,93,93,0.3)]">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rd opacity-70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-rd" />
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-rd">{active?.title}</span>
              <span className="hud-chip hud-chip-rd text-[7px]">{active ? classifyAlert(active.title) : ""}</span>
            </div>
            <div className="max-w-[440px] text-[10px] tracking-[0.04em] text-dim">{active?.body}</div>
          </div>
          <span className="ml-2 flex flex-col items-end leading-tight">
            <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-faint">ACK · AUTO</span>
            <span className="text-[8px] font-bold mono-tabular text-rd/70">{active ? fmt.time(active.met).slice(4) : ""}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function consoleMounted(): boolean {
  // plain runtime check (not a hook) — avoids re-subscribing effects
  return typeof window !== "undefined" && document.querySelector("main") !== null;
}
