"use client";

/**
 * LUNARMATCH 2.0 — global mission store
 * Client-side console state + deterministic live-telemetry jitter.
 */
import { create } from "zustand";
import type { ConsoleModule } from "./mission-data";

/* per-module session dwell odometer (seconds) */
export type DwellMap = Record<ConsoleModule, number>;
export const emptyDwell = (): DwellMap => ({ orbital: 0, dem: 0, photometric: 0, elevation: 0, archive: 0 });

export interface LiveTelemetry {
  sync: number; // SYNC LOCK %
  fps: number;
  frameMs: number;
  dsnSig: number; // dBm
  bufHealth: number; // %
  velocity: number; // km/s
  uplink: number; // MHz residual
  streamOnline: boolean;
  met: number; // mission elapsed seconds
  delayMs: number; // one-way Earth↔Luna light-time (ms)
}

/* ── mission replay journal ─────────────────────────────────── */
export type ReplayEventType = "NAV" | "CMD" | "ALERT" | "SYS" | "DATA";
export interface ReplayEvent {
  id: string;
  t: number; // MET seconds at emission
  type: ReplayEventType;
  label: string;
  detail?: string;
  module?: ConsoleModule; // for NAV re-enactment
}

export const REPLAY_TONE: Record<ReplayEventType, "cy" | "gr" | "am" | "rd" | "vi"> = {
  NAV: "cy",
  CMD: "gr",
  ALERT: "rd",
  SYS: "vi",
  DATA: "am",
};

/* ── DSN ground-station handover simulation ─────────────────── */
export interface DsnStation {
  id: string;
  complex: string; // GOLDSTONE / MADRID / CANBERRA
  dish: string; // DSS designator + aperture
  region: string;
}
export const DSN_STATIONS: DsnStation[] = [
  { id: "gds", complex: "GOLDSTONE", dish: "DSS-14 · 70M", region: "CALIFORNIA · USA" },
  { id: "mad", complex: "MADRID", dish: "DSS-63 · 70M", region: "ROBLEDO · SPAIN" },
  { id: "cnb", complex: "CANBERRA", dish: "DSS-43 · 70M", region: "TIDBINBILLA · AUS" },
];
export const PASS_DURATION = 240; // seconds of visible pass per station

/* ── downlink queue ─────────────────────────────────────────── */
export type DlPriority = "HIGH" | "NORM" | "LOW";
export interface DownlinkItem {
  id: string;
  label: string;
  kind: string; // TIFF / XML / CSV / LAS …
  sizeMb: number;
  sent: number; // MB transferred so far
  prio: DlPriority; // QoS class — HIGH preempts the scheduler
}
export const PRIO_ORDER: Record<DlPriority, number> = { HIGH: 0, NORM: 1, LOW: 2 };

/* ── alert history — every lm:alert flare is archived for triage ── */
export type AlertSeverity = "CRITICAL" | "CAUTION" | "ADVISORY";
export interface AlertEntry {
  id: string;
  met: number; // mission elapsed seconds at emission
  sev: AlertSeverity;
  title: string;
  body: string;
}
export const SEV_ORDER: AlertSeverity[] = ["CRITICAL", "CAUTION", "ADVISORY"];
/** classify an alert headline into the severity ladder */
export function classifyAlert(title: string): AlertSeverity {
  const t = title.toUpperCase();
  if (/ABORT|ANOMALY|FADE|FAIL|LOST|CRIT/.test(t)) return "CRITICAL";
  if (/THERMAL|PSR|POWER|GAIN|SATUR/.test(t)) return "CAUTION";
  return "ADVISORY";
}

const SCHEDULED_PRODUCTS: Array<[string, string, number, DlPriority]> = [
  ["SHACKLETON_DEM_QUAD_04", "TIFF", 48.2, "NORM"],
  ["TMC2_OHRC_STEREO_L2", "IMG", 126.5, "LOW"],
  ["PSR_PERSIST_MAP_V3", "GEOTIFF", 22.8, "NORM"],
  ["REGOLITH_IIF_CUBE", "CUBE", 84.1, "LOW"],
  ["POINTCLOUD_SHACKLETON", "LAS", 210.4, "LOW"],
  ["TRANSECT_AB_PROFILE", "CSV", 1.2, "HIGH"],
  ["LOLA_GRID_5M_RCL", "IMG", 64.7, "NORM"],
];
let downlinkId = 0;
let schedIdx = 0;

interface MissionState {
  booted: boolean;
  module: ConsoleModule;
  setModule: (m: ConsoleModule) => void;

  /* live telemetry tick */
  live: LiveTelemetry;
  tick: () => void;

  /* DSN station handover */
  stationIdx: number;
  stationElev: number; // degrees above horizon
  stationAz: number; // azimuth degrees
  passT: number; // seconds into current pass
  handoverActive: boolean;
  handoverCountdown: number; // seconds until handover completes (during active)

  /* downlink queue */
  downlink: DownlinkItem[];
  downlinkDone: number;
  enqueueProduct: (label: string, kind: string, sizeMb: number, prio?: DlPriority) => void;

  /* rover traverse sim → map overlay bridge */
  roverKm: number | null; // null = standby
  roverPhase: "IDLE" | "RUN" | "ABORT" | "DONE";
  setRover: (km: number | null, phase: "IDLE" | "RUN" | "ABORT" | "DONE") => void;

  /* mission replay tape */
  replayEvents: ReplayEvent[];
  logEvent: (type: ReplayEventType, label: string, detail?: string, module?: ConsoleModule) => void;
  clearReplay: () => void;
  replayOpen: boolean;
  setReplayOpen: (v: boolean) => void;
  replaySeq: number; // playback cursor — index into replayEvents, -1 = idle
  setReplaySeq: (v: number) => void;

  /* photometric lab params (drive viewport filters) */
  photoK: number;
  photoTheta: number;
  photoModel: string;
  setPhoto: (p: Partial<Pick<MissionState, "photoK" | "photoTheta" | "photoModel">>) => void;

  /* archive inspector */
  selectedPass: string;
  setSelectedPass: (id: string) => void;

  /* console fx */
  invertSun: boolean;
  toggleInvertSun: () => void;
  wireframe: boolean;
  toggleWireframe: () => void;

  /* operator aids */
  dwell: DwellMap; // seconds of operator attention per module (this session)
  legendOpen: boolean;
  setLegendOpen: (v: boolean) => void;

  /* alert history drawer */
  alertLog: AlertEntry[];
  logAlert: (title: string, body: string) => void;
  clearAlerts: () => void;
  alertLogOpen: boolean;
  setAlertLogOpen: (v: boolean) => void;
  unreadAlerts: number;
  markAlertsRead: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const jit = (base: number, amp: number, min = -Infinity, max = Infinity) =>
  clamp(base + (Math.random() - 0.5) * 2 * amp, min, max);

let replayId = 0;
let alertId = 0;
export const useMission = create<MissionState>((set, get) => ({
  booted: false,
  module: "orbital",
  setModule: (m) => set({ module: m }),

  live: {
    sync: 98.9,
    fps: 60,
    frameMs: 16,
    dsnSig: -88.4,
    bufHealth: 99.8,
    velocity: 1.633,
    uplink: 7165.2,
    streamOnline: true,
    met: 0,
    delayMs: 1282.3,
  },
  stationIdx: 0,
  stationElev: 31.2,
  stationAz: 187.4,
  passT: 118,
  handoverActive: false,
  handoverCountdown: 0,

  downlink: [
    { id: "dl-seed-0", label: "SHACKLETON_DEM_QUAD_01", kind: "TIFF", sizeMb: 48.2, sent: 31.6, prio: "NORM" as DlPriority },
  ],
  downlinkDone: 14,
  enqueueProduct: (label, kind, sizeMb, prio = "HIGH") =>
    set((s) => ({
      downlink: [...s.downlink.slice(-4), { id: `dl-${++downlinkId}`, label, kind, sizeMb, sent: 0, prio }],
    })),

  roverKm: null,
  roverPhase: "IDLE" as const,
  setRover: (km, phase) => set({ roverKm: km, roverPhase: phase }),

  tick: () => {
    const s = get();

    /* ── DSN handover state machine ── */
    let stationIdx = s.stationIdx;
    let passT = s.passT;
    let handoverActive = s.handoverActive;
    let handoverCountdown = s.handoverCountdown;
    let handoverHappened: DsnStation | null = null;

    if (handoverActive) {
      handoverCountdown -= 1;
      if (handoverCountdown <= 0) {
        stationIdx = (stationIdx + 1) % DSN_STATIONS.length;
        passT = 0;
        handoverActive = false;
        handoverCountdown = 0;
        handoverHappened = DSN_STATIONS[stationIdx];
      }
    } else {
      passT += 1;
      if (passT >= PASS_DURATION - 6) {
        handoverActive = true;
        handoverCountdown = 6;
      }
    }

    const elev = Math.max(4, 64 * Math.sin(Math.PI * Math.min(passT, PASS_DURATION) / PASS_DURATION));
    const az = 168 + (passT / PASS_DURATION) * 52; // slow drift across the southern sky

    if (handoverHappened) {
      get().logEvent("SYS", `DSN HANDOVER → ${handoverHappened.complex}`, `${handoverHappened.dish} · AOS ${handoverHappened.region}`);
    }

    /* ── downlink queue advance (QoS: HIGH preempts, LOW bulk-collapsed) ── */
    const throughput = handoverActive ? 8 : jit(96, 26, 42, 148); // Mbps — degraded during handover
    let done = s.downlinkDone;
    const sorted = [...s.downlink].sort((a, b) => PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio]);
    const advanced = sorted.map((it) => {
      const share = it.prio === "HIGH" ? 2 : it.prio === "LOW" ? 0.55 : 1;
      const sent = it.sent + (throughput / 8) * share;
      if (sent >= it.sizeMb) {
        done += 1;
        return null;
      }
      return { ...it, sent };
    });
    const downlink = advanced.filter((it): it is DownlinkItem => it !== null);

    /* scheduler — keep the pipe fed with simulated queued products */
    if (downlink.length < 2 && Math.random() < 0.12) {
      const [label, kind, sizeMb, prio] = SCHEDULED_PRODUCTS[schedIdx++ % SCHEDULED_PRODUCTS.length];
      downlink.push({ id: `dl-${++downlinkId}`, label, kind, sizeMb, sent: 0, prio });
    }

    /* module dwell odometer — attention time accrues to the active module */
    const dwell = { ...s.dwell };
    dwell[s.module] = dwell[s.module] + 1;

    return set((st) => ({
      stationIdx,
      passT,
      handoverActive,
      handoverCountdown,
      stationElev: jit(elev, 0.18, 3.5, 68.5),
      stationAz: az,
      downlink,
      downlinkDone: done,
      dwell,
      live: {
        ...st.live,
        sync: jit(98.9, 0.08, 98.4, 99.3),
        fps: jit(60, 1.4, 56, 62),
        frameMs: jit(16, 0.7, 14, 19),
        dsnSig: jit(-(94 - 0.18 * elev), 0.35, -95.5, -81.5),
        bufHealth: jit(99.8, 0.05, 99.5, 99.9),
        velocity: jit(1.633, 0.002, 1.628, 1.639),
        uplink: jit(7165.2, 0.04, 7165.05, 7165.4),
        streamOnline: handoverActive ? Math.random() > 0.06 : Math.random() > 0.005,
        met: st.live.met + 1,
        delayMs: jit(1282.3, 1.1, 1279.2, 1286.4),
      },
    }));
  },

  replayEvents: [
    { id: "seed-0", t: 0, type: "SYS", label: "DSN HANDSHAKE COMPLETE", detail: "GOLDSTONE 34M · KA-BAND" },
    { id: "seed-1", t: 0, type: "SYS", label: "STAR TRACKER ALIGNMENT", detail: "QUATERNION CONVERGED 0.019°" },
    { id: "seed-2", t: 0, type: "DATA", label: "TMC-2 ⇌ OHRC REGISTER OPEN", detail: "1,482 PASSES INDEXED" },
  ],
  logEvent: (type, label, detail, module) =>
    set((s) => ({
      replayEvents: [
        ...s.replayEvents.slice(-59),
        { id: `ev-${++replayId}`, t: get().live.met, type, label, detail, module },
      ],
    })),
  clearReplay: () => set({ replayEvents: [], replaySeq: -1 }),
  replayOpen: false,
  setReplayOpen: (v) => set({ replayOpen: v }),
  replaySeq: -1,
  setReplaySeq: (v) => set({ replaySeq: v }),

  photoK: 0.742,
  photoTheta: 24.5,
  photoModel: "LOMMEL-SEELIGER",
  setPhoto: (p) => set(p),

  selectedPass: "PASS-0498",
  setSelectedPass: (id) => set({ selectedPass: id }),

  invertSun: false,
  toggleInvertSun: () => set((s) => ({ invertSun: !s.invertSun })),
  wireframe: false,
  toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),

  dwell: emptyDwell(),
  legendOpen: false,
  setLegendOpen: (v) => set({ legendOpen: v }),

  alertLog: [],
  logAlert: (title, body) =>
    set((s) => ({
      alertLog: [
        ...s.alertLog.slice(-39),
        {
          id: `al-${++alertId}`,
          met: get().live.met,
          sev: classifyAlert(title),
          title,
          body,
        },
      ],
      unreadAlerts: s.alertLogOpen ? 0 : s.unreadAlerts + 1,
    })),
  clearAlerts: () => set({ alertLog: [], unreadAlerts: 0 }),
  alertLogOpen: false,
  setAlertLogOpen: (v) => set({ alertLogOpen: v, ...(v ? { unreadAlerts: 0 } : {}) }),
  unreadAlerts: 0,
  markAlertsRead: () => set({ unreadAlerts: 0 }),
}));

/* ── replay journal persistence — the tape survives page reloads ── */
const TAPE_KEY = "lm-replay-tape-v1";
let tapeHydrated = false;

export function hydrateTape(): number {
  if (typeof window === "undefined" || tapeHydrated) return 0;
  tapeHydrated = true;
  try {
    const raw = window.localStorage.getItem(TAPE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as ReplayEvent[];
    if (!Array.isArray(parsed)) return 0;
    const clean = parsed
      .filter((e) => e && typeof e.id === "string" && typeof e.t === "number" && typeof e.type === "string" && typeof e.label === "string")
      .slice(-60);
    if (clean.length === 0) return 0;
    const maxId = clean.reduce((m, e) => Math.max(m, Number(String(e.id).replace("ev-", "")) || 0), 0);
    replayId = Math.max(replayId, maxId);
    useMission.setState({ replayEvents: clean });
    return clean.length;
  } catch {
    return 0;
  }
}

export function eraseTapeStorage() {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(TAPE_KEY);
  } catch {
    /* storage unavailable — tape stays memory-only */
  }
}

if (typeof window !== "undefined") {
  useMission.subscribe((s, prev) => {
    if (s.replayEvents === prev.replayEvents) return;
    try {
      window.localStorage.setItem(TAPE_KEY, JSON.stringify(s.replayEvents.slice(-60)));
    } catch {
      /* quota / private mode — non-fatal */
    }
  });
}

/* ── alert journal persistence — triage history survives page reloads ── */
const ALERT_KEY = "lm-alert-log-v1";
let alertsHydrated = false;

export function hydrateAlertLog(): number {
  if (typeof window === "undefined" || alertsHydrated) return 0;
  alertsHydrated = true;
  try {
    const raw = window.localStorage.getItem(ALERT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as AlertEntry[];
    if (!Array.isArray(parsed)) return 0;
    const clean = parsed
      .filter(
        (a) =>
          a &&
          typeof a.id === "string" &&
          typeof a.met === "number" &&
          (a.sev === "CRITICAL" || a.sev === "CAUTION" || a.sev === "ADVISORY") &&
          typeof a.title === "string" &&
          typeof a.body === "string",
      )
      .slice(-40);
    if (clean.length === 0) return 0;
    const maxId = clean.reduce((m, a) => Math.max(m, Number(String(a.id).replace("al-", "")) || 0), 0);
    alertId = Math.max(alertId, maxId);
    useMission.setState({ alertLog: clean });
    return clean.length;
  } catch {
    return 0;
  }
}

export function eraseAlertStorage() {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(ALERT_KEY);
  } catch {
    /* storage unavailable — alerts stay memory-only */
  }
}

if (typeof window !== "undefined") {
  useMission.subscribe((s, prev) => {
    if (s.alertLog === prev.alertLog) return;
    try {
      window.localStorage.setItem(ALERT_KEY, JSON.stringify(s.alertLog.slice(-40)));
    } catch {
      /* quota / private mode — non-fatal */
    }
  });
}

/* formatting helpers */
export const fmt = {
  n: (v: number, d = 2) => v.toFixed(d),
  signed: (v: number, d = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}`,
  time: (secs: number) => {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `T+${String(d).padStart(3, "0")}:${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
};
