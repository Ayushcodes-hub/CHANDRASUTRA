"use client";

/**
 * LUNARMATCH 2.0 — ⌘K mission command console (v2)
 * cmdk-powered operator palette: module nav, console actions, data exports.
 */
import * as React from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Orbit, Mountain, SunMedium, TrendingUp, Radio, Frame, Sun,
  RotateCcw, FileDown, FileJson, RefreshCw, Power, Clock, Rocket, History, Trash2, Link2, Braces, Keyboard, BellRing, Zap,
} from "lucide-react";
import { MODULES } from "@/lib/mission-data";
import { useMission } from "@/lib/mission-store";
import { useToast } from "@/hooks/use-toast";

const MODULE_ICONS = [Orbit, Mountain, SunMedium, TrendingUp, Radio];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const setModule = useMission((s) => s.setModule);
  const toggleWireframe = useMission((s) => s.toggleWireframe);
  const toggleInvertSun = useMission((s) => s.toggleInvertSun);
  const { toast } = useToast();

  /* ⌘K / Ctrl+K + [ key open */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void, logLabel?: string) => {
    setOpen(false);
    if (logLabel) useMission.getState().logEvent("CMD", logLabel);
    fn();
  };

  const nav = (id: (typeof MODULES)[number]["id"], label: string, i: number) => (
    <CommandItem
      key={id}
      value={`goto ${label}`}
      onSelect={() => run(() => setModule(id))}
      className="gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.08em] text-dim aria-selected:bg-cy/10 aria-selected:text-cy"
    >
      {React.createElement(MODULE_ICONS[i], { className: "size-3.5 text-cy" })}
      <span>GOTO / {label}</span>
      <span className="ml-auto text-[9px] text-faint">KEY {i + 1}</span>
    </CommandItem>
  );

  const action = (
    key: string,
    label: string,
    Icon: React.ElementType,
    fn: () => void,
    hint?: string
  ) => (
    <CommandItem
      key={key}
      value={label}
      onSelect={() => run(fn, label)}
      className="gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.08em] text-dim aria-selected:bg-cy/10 aria-selected:text-cy"
    >
      <Icon className="size-3.5 text-gr" />
      <span>{label}</span>
      {hint && <span className="ml-auto text-[9px] text-faint">{hint}</span>}
    </CommandItem>
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="LUNARMATCH COMMAND CONSOLE"
      description="Execute mission commands"
      showCloseButton={false}
      className="sm:max-w-[560px]"
    >
      <div
        dir="ltr"
        className="hud-panel corners relative border-0 bg-[#0a0e14] font-mono shadow-[0_0_60px_rgba(45,217,236,0.15)]"
      >
        <span className="corner-b" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-cy text-glow-cy">
            ⌘ MISSION COMMAND CONSOLE
          </span>
          <span className="text-[9px] tracking-[0.14em] text-faint">ESC TO ABORT · ⌘K TOGGLE</span>
        </div>
        <Command className="bg-transparent">
          <CommandInput
            placeholder="> type a command… (e.g. photometric, export, invert)"
            className="h-11 border-0 font-mono text-[12px] tracking-[0.06em] text-ink placeholder:text-faint"
          />
          <CommandList className="max-h-[340px] px-1.5 pb-2">
            <CommandEmpty className="py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-rd">
              ✕ NO MATCHING COMMAND IN FLIGHT COMPUTER
            </CommandEmpty>

            <CommandGroup
              heading="NAVIGATE // MODULES"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[8.5px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-faint"
            >
              {MODULES.map((m, i) => nav(m.id, m.label, i))}
            </CommandGroup>
            <CommandSeparator className="bg-line" />

            <CommandGroup
              heading="CONSOLE ACTIONS"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[8.5px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-faint"
            >
              {action("wireframe", "TOGGLE WIREFRAME MODE", Frame, () => {
                toggleWireframe();
                toast({ title: "F1 · WIREFRAME", description: "Render mode toggled." });
              }, "F1")}
              {action("sun", "INVERT SUN VECTOR", Sun, () => {
                toggleInvertSun();
                toast({ title: "F2 · SUN VECTOR", description: "Illumination inverted." });
              }, "F2")}
              {action("reset", "RESET CAMERA RIG", RotateCcw, () => {
                window.dispatchEvent(new CustomEvent("lm:reset-cam"));
                toast({ title: "ESC · CAMERA", description: "Camera rig re-centered to nadir." });
              }, "ESC")}
              {action("boot", "REPLAY BOOT SEQUENCE", Rocket, () => {
                useMission.setState({ booted: false });
                setTimeout(() => useMission.setState({ booted: true }), 3200);
                toast({ title: "REPLAY", description: "Re-running DSN boot handshake." });
              })}
              {action("tape", "OPEN MISSION REPLAY TAPE", History, () => {
                useMission.getState().setReplayOpen(true);
                toast({ title: "REPLAY TAPE", description: "Event journal drawer open — F6 to toggle." });
              }, "F6")}
              {action("legend", "OPEN HOTKEY LEGEND", Keyboard, () => {
                useMission.getState().setLegendOpen(true);
                toast({ title: "HOTKEY LEGEND", description: "Full operator keybind map — press ? to toggle." });
              }, "?")}
              {action("alerts", "OPEN ALERT HISTORY TRIAGE", BellRing, () => {
                useMission.getState().setAlertLogOpen(true);
                toast({ title: "ALERT TRIAGE", description: "Severity timeline drawer open — A to toggle." });
              }, "A")}
              {action("anomaly", "INJECT TEST ANOMALY (DRILL)", Zap, () => {
                window.dispatchEvent(new CustomEvent("lm:alert", {
                  detail: { title: "DRILL ANOMALY", body: "Operator-injected test fault — RF ranging residual +0.4σ, auto-recovery armed." },
                }));
                toast({ title: "DRILL INJECTED", description: "Test anomaly dispatched through the flare pipeline." });
              })}
            </CommandGroup>
            <CommandSeparator className="bg-line" />

            <CommandGroup
              heading="DATA // EXPORTS"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[8.5px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-faint"
            >
              {action("pds4", "EXPORT PDS4 PRODUCT LABEL", FileJson, () => {
                window.open("/api/mission/export/pds4");
                useMission.getState().enqueueProduct("PDS4_PRODUCT_LABEL", "XML", 18.6);
                toast({ title: "EXPORT", description: "PDS4 label streaming — queued to downlink." });
              })}
              {action("csv", "EXPORT ORBIT PASS ARCHIVE (CSV)", FileDown, () => {
                window.open("/api/mission/export/passes");
                useMission.getState().enqueueProduct("ORBIT_PASS_ARCHIVE", "CSV", 9.4);
                toast({ title: "EXPORT", description: "Pass archive CSV streaming — queued to downlink." });
              })}
              {action("intel", "REFRESH VLM INTEL FEEDS", RefreshCw, () => {
                window.dispatchEvent(new CustomEvent("lm:refresh-intel"));
                toast({ title: "VLM INTEL", description: "Re-querying LUNAR-GEOAI V4.1…" });
              })}
              {action("met", "SYNC MISSION CLOCK (MASER)", Clock, () => {
                toast({ title: "MASER LOCK", description: "Clock drift +0.0024 ms — resynced." });
              })}
              {action("queue", "PURGE DOWNLINK QUEUE", Trash2, () => {
                useMission.setState({ downlink: [] });
                toast({ title: "DOWNLINK QUEUE", description: "Pending products purged — pipe idle." });
              })}
              {action("share", "COPY SHAREABLE CONSOLE LINK", Link2, () => {
                const s = useMission.getState();
                const params = new URLSearchParams({ m: s.module });
                if (s.wireframe) params.set("f", "1");
                if (s.invertSun) params.set("s", "1");
                if (s.selectedPass) params.set("p", s.selectedPass);
                const url = `${window.location.origin}${window.location.pathname}#${params.toString()}`;
                const done = () => toast({ title: "SHARE LINK COPIED", description: `Console state encoded — ${url.slice(0, 48)}…` });
                if (navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(url).then(done).catch(() =>
                    toast({ title: "CLIPBOARD BLOCKED", description: "Copy the URL bar — state is already encoded in the #hash." })
                  );
                } else done();
              }, "#HASH")}
              {action("tape-export", "EXPORT TAPE JOURNAL (JSON)", Braces, () => {
                const events = useMission.getState().replayEvents;
                if (events.length === 0) {
                  toast({ title: "TAPE EMPTY", description: "No events recorded yet." });
                  return;
                }
                const blob = new Blob([JSON.stringify({ console: "LUNARMATCH 2.0", exportedAt: new Date().toISOString(), events }, null, 2)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "lunarmatch-tape-journal.json";
                a.click();
                URL.revokeObjectURL(a.href);
                useMission.getState().enqueueProduct("TAPE_JOURNAL_JSON", "JSON", 0.3);
                toast({ title: "JOURNAL EXPORTED", description: `${events.length} events written — queued to downlink.` });
              })}
              {action("down", "SAFE STREAM (DRILL MODE)", Power, () => {
                toast({ title: "DRILL MODE", description: "Carrier safe — telemetry held." });
              })}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between border-t border-line px-3.5 py-1.5">
            <span className="text-[8.5px] uppercase tracking-[0.16em] text-faint">DSN::ORB-4 FLIGHT COMPUTER</span>
            <span className="flex items-center gap-1.5 text-[8.5px] uppercase tracking-[0.16em] text-gr">
              <span className="inline-block size-[5px] rounded-full bg-gr animate-pulse-dot" />
              READY
            </span>
          </div>
        </Command>
      </div>
    </CommandDialog>
  );
}
