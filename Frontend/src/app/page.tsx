"use client";

/**
 * LUNARMATCH 2.0 — DEEP SPACE MISSION CONSOLE
 * Single-console shell: boot sequence → module switchboard with warp transitions.
 */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMission } from "@/lib/mission-store";
import { MODULES } from "@/lib/mission-data";
import type { ConsoleModule } from "@/lib/mission-data";
import { Starfield } from "@/components/hud/Starfield";
import { TopBar } from "@/components/dashboard/TopBar";
import { PhaseRail } from "@/components/dashboard/PhaseRail";
import { MissionSidebar } from "@/components/dashboard/MissionSidebar";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { BootSequence } from "@/components/dashboard/BootSequence";
import { CommandPalette } from "@/components/dashboard/MissionCommandDeck";
import { AlertFlare } from "@/components/dashboard/AlertFlare";
import { AlertHistory } from "@/components/dashboard/AlertHistory";
import { ModuleStinger } from "@/components/dashboard/ModuleStinger";
import { MissionReplayTape } from "@/components/dashboard/MissionReplayTape";
import { HotkeyLegend } from "@/components/dashboard/HotkeyLegend";

import OrbitalRegistration from "@/components/views/OrbitalRegistration";
import DemSynthesis from "@/components/views/DemSynthesis";
import PhotometricLab from "@/components/views/PhotometricLab";
import ElevationProfiles from "@/components/views/ElevationProfiles";
import TelemetryArchive from "@/components/views/TelemetryArchive";

export default function Console() {
  const booted = useMission((s) => s.booted);
  const mod = useMission((s) => s.module);
  const setModule = useMission((s) => s.setModule);
  const tick = useMission((s) => s.tick);
  const toggleWireframe = useMission((s) => s.toggleWireframe);
  const toggleInvertSun = useMission((s) => s.toggleInvertSun);
  const setBooted = React.useCallback(() => useMission.setState({ booted: true }), []);
  const mainRef = React.useRef<HTMLElement>(null);
  const prevMod = React.useRef(useMission.getState().module);

  /* live telemetry heartbeat */
  React.useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  /* mission replay journal — record operator navigation (skipped during playback re-enactment) */
  React.useEffect(() => {
    if (mod === prevMod.current) return;
    prevMod.current = mod;
    const s = useMission.getState();
    if (s.replaySeq >= 0) return; // playback driving — do not re-record
    const label = MODULES.find((m) => m.id === mod)?.label ?? mod.toUpperCase();
    s.logEvent("NAV", `MODULE → ${label}`, `CONSOLE SECTION ${MODULES.findIndex((m) => m.id === mod) + 1}/5 SELECTED`, mod);
  }, [mod]);

  /* boot-complete journal entry */
  React.useEffect(() => {
    if (booted) useMission.getState().logEvent("SYS", "CONSOLE OPERATOR SESSION OPEN", "ALL 5 MODULES NOMINAL · REC ON");
  }, [booted]);

  /* shareable console state — restore from URL hash on mount (#m=…&f=1&s=1&p=…) */
  React.useEffect(() => {
    try {
      const h = new URLSearchParams(window.location.hash.slice(1));
      const m = h.get("m");
      if (m && MODULES.some((x) => x.id === m)) useMission.setState({ module: m as ConsoleModule });
      const patch: Partial<{ wireframe: boolean; invertSun: boolean; selectedPass: string }> = {};
      if (h.get("f") === "1") patch.wireframe = true;
      if (h.get("s") === "1") patch.invertSun = true;
      const p = h.get("p");
      if (p) patch.selectedPass = p;
      if (Object.keys(patch).length) useMission.setState(patch);
    } catch {
      /* malformed hash — boot clean */
    }
  }, []);

  /* keep the URL hash mirrored to operator state (shareable console links) */
  React.useEffect(() => {
    const writeHash = () => {
      const s = useMission.getState();
      const params = new URLSearchParams({ m: s.module });
      if (s.wireframe) params.set("f", "1");
      if (s.invertSun) params.set("s", "1");
      if (s.selectedPass) params.set("p", s.selectedPass);
      window.history.replaceState(null, "", `#${params.toString()}`);
    };
    writeHash();
    return useMission.subscribe((s, prev) => {
      if (s.module === prev.module && s.wireframe === prev.wireframe && s.invertSun === prev.invertSun && s.selectedPass === prev.selectedPass) return;
      writeHash();
    });
  }, []);

  /* reset stage scroll on module change */
  React.useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [mod]);

  /* console hotkeys */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key) {
        case "F1": e.preventDefault(); toggleWireframe(); break;
        case "F2": e.preventDefault(); toggleInvertSun(); break;
        case "F6": e.preventDefault(); useMission.setState({ replayOpen: !useMission.getState().replayOpen }); break;
        case "Escape": window.dispatchEvent(new CustomEvent("lm:reset-cam")); break;
        case "1": setModule("orbital"); break;
        case "2": setModule("dem"); break;
        case "3": setModule("photometric"); break;
        case "4": setModule("elevation"); break;
        case "5": setModule("archive"); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setModule, toggleWireframe, toggleInvertSun]);

  return (
    <div className="relative h-screen flex flex-col overflow-hidden bg-void">
      {/* ambient space backdrop */}
      <div className="space-nebula" aria-hidden="true" />
      <Starfield />
      <div className="space-grid" aria-hidden="true" />
      <div className="space-grain" aria-hidden="true" />

      {!booted && <BootSequence onDone={setBooted} />}

      <TopBar />

      <PhaseRail />

      <div className="flex flex-1 min-h-0 relative z-10">
        <MissionSidebar />

        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-2 sm:p-2.5" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={mod}
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-full"
            >
              {mod === "orbital" && <OrbitalRegistration />}
              {mod === "dem" && <DemSynthesis />}
              {mod === "photometric" && <PhotometricLab />}
              {mod === "elevation" && <ElevationProfiles />}
              {mod === "archive" && <TelemetryArchive />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <StatusBar />
      <CommandPalette />
      <MissionReplayTape />
      <AlertFlare />
      <AlertHistory />
      <ModuleStinger />
      <HotkeyLegend />
    </div>
  );
}
