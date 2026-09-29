"use client";

/**
 * LUNARMATCH 2.0 — MODULE 05 // TELEMETRY ARCHIVE
 * DSN archive query engine: carrier telemetry oscilloscope, orbit pass register,
 * MAGSAC inspector, accuracy distribution + operational incident log.
 */
import * as React from "react";
import {
  Download,
  RotateCcw,
  GitCompare,
  TriangleAlert,
  FileText,
  UploadCloud,
  Grid3x3,
  Cloud,
  Box,
  FileJson,
  Star,
} from "lucide-react";
import {
  Panel,
  Lbl,
  Chip,
  Stat,
  Btn,
  Bar,
  Code,
  SubHead,
} from "@/components/hud/primitives";
import { Histogram, Sparkline } from "@/components/hud/charts";
import { ARCHIVE } from "@/lib/mission-data";
import { useMission } from "@/lib/mission-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

/* ── Data model ─────────────────────────────────────────────── */
interface PassRow {
  passId: string;
  epoch: string;
  siteName: string;
  lat: string;
  lon: string;
  sensorA: string;
  sensorB: string;
  inlierRatio: number;
  inliersMatched: number;
  inliersTotal: number;
  rmse: number;
  psnr: number;
  ssim: number;
  status: string;
  flagged: boolean;
}

interface IncidentRow {
  pass: string;
  tag: string;
  title: string;
  body: string;
  severity: "CRIT" | "WARN" | "INFO";
}

/* ── Fallback archive (verbatim reference frames) ───────────── */
const FALLBACK_PASSES: PassRow[] = [
  { passId: "PASS-0498", epoch: "2024-10-28 14:22:09", siteName: "SHACKLETON S-POLE", lat: "89.90° S", lon: "000.00° E", sensorA: "TMC-2", sensorB: "OHRC", inlierRatio: 98.9, inliersMatched: 3851, inliersTotal: 3894, rmse: 0.11, psnr: 12.64, ssim: 0.994, status: "LOCKED", flagged: false },
  { passId: "PASS-0495", epoch: "2024-10-27 21:05:44", siteName: "TYCHO CENTRAL PEAK", lat: "43.31° S", lon: "011.36° W", sensorA: "TMC-2", sensorB: "OHRC", inlierRatio: 97.4, inliersMatched: 3410, inliersTotal: 3502, rmse: 0.13, psnr: 11.99, ssim: 0.979, status: "LOCKED", flagged: false },
  { passId: "PASS-0491", epoch: "2024-10-26 08:49:12", siteName: "BOGUSLAWSKY CRATER", lat: "72.90° S", lon: "043.20° E", sensorA: "LOLA", sensorB: "SHADOW", inlierRatio: 95.8, inliersMatched: 2890, inliersTotal: 3016, rmse: 0.16, psnr: 10.22, ssim: 0.962, status: "LOCKED", flagged: false },
  { passId: "PASS-0488", epoch: "2024-10-25 18:30:00", siteName: "MARE TRANQUILLITATIS", lat: "08.50° N", lon: "031.40° E", sensorA: "TMC-2", sensorB: "OHRC", inlierRatio: 99.4, inliersMatched: 4420, inliersTotal: 4445, rmse: 0.08, psnr: 14.15, ssim: 0.991, status: "LOCKED", flagged: false },
  { passId: "PASS-0487", epoch: "2024-10-24 11:15:32", siteName: "SHOEMAKER CRATER", lat: "88.10° S", lon: "046.00° E", sensorA: "LROC", sensorB: "CH2-TMC", inlierRatio: 88.2, inliersMatched: 2104, inliersTotal: 2385, rmse: 0.29, psnr: 8.4, ssim: 0.912, status: "FLAGGED", flagged: true },
  { passId: "PASS-0492", epoch: "2024-10-23 04:40:19", siteName: "FAUSTINI RIDGE", lat: "87.30° S", lon: "077.00° E", sensorA: "TMC-2", sensorB: "OHRC", inlierRatio: 98.1, inliersMatched: 3612, inliersTotal: 3680, rmse: 0.12, psnr: 12.19, ssim: 0.988, status: "LOCKED", flagged: false },
  { passId: "PASS-0472", epoch: "2024-10-21 16:55:01", siteName: "NOBLE CRATER RIM", lat: "85.20° S", lon: "053.50° E", sensorA: "SAR", sensorB: "OPTICAL", inlierRatio: 99.6, inliersMatched: 2410, inliersTotal: 2420, rmse: 0.24, psnr: 9.6, ssim: 0.938, status: "REVIEW", flagged: false },
  { passId: "PASS-0468", epoch: "2024-10-20 02:11:45", siteName: "AMUNDSEN BASIN", lat: "84.50° S", lon: "082.50° E", sensorA: "TMC-2", sensorB: "OHRC", inlierRatio: 98.5, inliersMatched: 3780, inliersTotal: 3837, rmse: 0.1, psnr: 13.4, ssim: 0.986, status: "LOCKED", flagged: false },
];

/* ── Deterministic keypoint dispersion field (30 pts) ───────── */
const KP_DOTS = Array.from({ length: 30 }, (_, i) => ({
  x: 6 + ((i * 53) % 88),
  y: 9 + ((i * 37) % 76),
  green: i % 5 === 0,
  r: 1.4 + ((i * 7) % 10) / 9,
  delay: ((i * 0.17) % 1.4).toFixed(2),
}));

/* ── Deterministic carrier spectrum bar heights ─────────────── */
const SPEC_BARS = Array.from({ length: 24 }, (_, i) => 22 + ((i * 47) % 61) + (i % 3) * 6);

/* ── Oscilloscope (canvas, RAF, reduced-motion aware) ───────── */
function Oscilloscope() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      if (!w || !h) return;
      const time = t / 1000;
      ctx.clearRect(0, 0, w, h);

      /* grid */
      ctx.strokeStyle = "rgba(38,51,66,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 18.5; x < w; x += 18) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 14.5; y < h; y += 14) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(45,217,236,0.16)";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      /* 3 carrier traces (CH-01 cyan / CH-02 green / CH-03 orange) */
      const waves = ARCHIVE.channels.map((ch, i) => ({
        color: ch.color,
        amp: [h * 0.3, h * 0.2, h * 0.11][i],
        freq: [0.05, 0.082, 0.034][i],
        speed: [1.15, 1.7, 0.65][i],
        phase: i * 2.09,
      }));

      for (const wv of waves) {
        ctx.beginPath();
        ctx.shadowColor = wv.color;
        ctx.shadowBlur = 7;
        ctx.strokeStyle = wv.color;
        ctx.lineWidth = 1.3;
        for (let x = 0; x <= w; x += 2) {
          const env = 0.72 + 0.28 * Math.sin(x * 0.012 + time * 0.6 + wv.phase);
          const noise =
            Math.sin(x * 0.9 + time * 4.2 + wv.phase * 3) * 1.05 +
            Math.sin(x * 2.3 - time * 6.1) * 0.55;
          const y = h / 2 + Math.sin(x * wv.freq + time * wv.speed + wv.phase) * wv.amp * env + noise;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);

    if (reduced) draw(0);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="RF carrier oscilloscope: three telemetry channels with slow phase drift"
      className="hud-inset block h-[120px] w-full"
    />
  );
}

/* ── Correlation cell tone ──────────────────────────────────── */
function corrClass(v: number): string {
  if (v >= 0.995) return "text-cy font-extrabold text-glow-cy";
  if (v >= 0.9) return "text-gr font-bold";
  if (v >= 0.8) return "text-dim";
  return "text-faint";
}

/* ══ MAIN VIEW ════════════════════════════════════════════════ */
export default function TelemetryArchive() {
  const { toast } = useToast();
  const selectedPass = useMission((s) => s.selectedPass);
  const setSelectedPass = useMission((s) => s.setSelectedPass);
  const logEvent = useMission((s) => s.logEvent);

  /* archive fetch (DB → fallback) */
  const [passes, setPasses] = React.useState<PassRow[]>(FALLBACK_PASSES);
  const [incidents, setIncidents] = React.useState<IncidentRow[]>(ARCHIVE.incidents);
  const [flagOnly, setFlagOnly] = React.useState(false);
  const [flagBusy, setFlagBusy] = React.useState<string | null>(null);

  /* A/B register comparator — operator pins two passes for delta inspection */
  const [pinA, setPinA] = React.useState<string | null>(null);
  const [pinB, setPinB] = React.useState<string | null>(null);
  const rowA = passes.find((p) => p.passId === pinA) ?? null;
  const rowB = passes.find((p) => p.passId === pinB) ?? null;
  /* verdict tally — which slot leads the 5-metric delta (null when not fully pinned) */
  const verdict = React.useMemo<{ a: number; b: number; total: number } | null>(() => {
    if (!rowA || !rowB) return null;
    const metrics: Array<{ a: number; b: number; hi: boolean }> = [
      { a: rowA.inlierRatio, b: rowB.inlierRatio, hi: true },
      { a: rowA.rmse, b: rowB.rmse, hi: false },
      { a: rowA.psnr, b: rowB.psnr, hi: true },
      { a: rowA.ssim, b: rowB.ssim, hi: true },
      { a: (rowA.inliersMatched / rowA.inliersTotal) * 100, b: (rowB.inliersMatched / rowB.inliersTotal) * 100, hi: true },
    ];
    let a = 0;
    let b = 0;
    for (const m of metrics) {
      const d = m.a - m.b;
      if (Math.abs(d) < 1e-9) continue;
      if (m.hi ? d > 0 : d < 0) a++;
      else b++;
    }
    return { a, b, total: metrics.length };
  }, [rowA, rowB]);
  const pinCompare = (slot: "A" | "B", row: PassRow) => {
    const cur = slot === "A" ? pinA : pinB;
    const next = cur === row.passId ? null : row.passId;
    if (slot === "A") setPinA(next);
    else setPinB(next);
    if (next) {
      logEvent("DATA", `${row.passId} PINNED → SLOT ${slot}`, `A/B REGISTER DELTA · ${row.siteName}`);
      toast({ title: `COMPARATOR SLOT ${slot}`, description: `${row.passId} pinned — ${row.siteName}` });
    }
  };

  React.useEffect(() => {
    let alive = true;
    fetch("/api/mission/passes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("archive-down"))))
      .then((data) => {
        if (!alive || !Array.isArray(data?.passes) || data.passes.length === 0) return;
        setPasses(data.passes as PassRow[]);
        if (Array.isArray(data?.incidents) && data.incidents.length > 0) {
          setIncidents(
            (data.incidents as Record<string, string>[]).map((i) => ({
              pass: (i.passRef ?? i.pass ?? "—") as string,
              tag: i.tag ?? "",
              title: i.title ?? "",
              body: i.body ?? "",
              severity: (i.severity ?? "INFO") as IncidentRow["severity"],
            }))
          );
        }
      })
      .catch(() => {
        /* offline → embedded reference frames already loaded */
      });
    return () => {
      alive = false;
    };
  }, []);

  /* query strip state */
  const [basin, setBasin] = React.useState("SHACKLETON");
  const [sensor, setSensor] = React.useState("TMC-2 STEREO");
  const [solver, setSolver] = React.useState("LOFTR + USAC");
  const [query, setQuery] = React.useState("");
  const [sortDesc, setSortDesc] = React.useState(true);

  /* operator review flag — optimistic flip + DB persistence */
  const toggleFlag = React.useCallback(
    (row: PassRow) => {
      const next = !row.flagged;
      setPasses((prev) =>
        prev.map((p) =>
          p.passId === row.passId ? { ...p, flagged: next, status: next ? "FLAGGED" : "LOCKED" } : p
        )
      );
      logEvent(
        "DATA",
        `${next ? "FLAG" : "CLEAR FLAG"} · ${row.passId}`,
        `${row.siteName} — OPERATOR REVIEW ${next ? "REQUIRED" : "COMPLETE"}`
      );
      toast({
        title: next ? "PASS FLAGGED FOR REVIEW" : "FLAG CLEARED — PASS LOCKED",
        description: `${row.passId} // ${row.siteName} — PATCH /api/mission/passes QUEUED`,
      });
      setFlagBusy(row.passId);
      fetch("/api/mission/passes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passId: row.passId, flagged: next, status: next ? "FLAGGED" : "LOCKED" }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("patch-failed");
        })
        .catch(() => {
          /* offline fallback rows stay flipped locally */
        })
        .finally(() => setFlagBusy(null));
    },
    [logEvent, toast]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toUpperCase();
    const base = passes.filter(
      (p) =>
        (!flagOnly || p.flagged) &&
        (!q || p.passId.toUpperCase().includes(q) || p.siteName.toUpperCase().includes(q))
    );
    return [...base].sort((a, b) =>
      sortDesc ? b.passId.localeCompare(a.passId) : a.passId.localeCompare(b.passId)
    );
  }, [passes, query, sortDesc, flagOnly]);

  /* inspector target (falls back to 0498 reference numbers) */
  const sel: PassRow =
    passes.find((p) => p.passId === selectedPass) ?? passes[0] ?? FALLBACK_PASSES[0];
  const detected = Math.round(sel.inliersTotal * 1.058);
  const candidates = Math.round(detected * 0.288);

  const ratioTone = (r: number) => (r >= 98 ? "text-gr" : r >= 95 ? "text-cy" : "text-am");

  const sevChip = { CRIT: "rd", WARN: "am", INFO: "cy" } as const;
  const sevBorder = { CRIT: "#ff5d5d", WARN: "#ffb454", INFO: "#2dd9ec" } as const;

  const exportIcons: Record<string, React.ReactNode> = {
    grid: <Grid3x3 className="size-[13px]" aria-hidden="true" />,
    cloud: <Cloud className="size-[13px]" aria-hidden="true" />,
    tensor: <Box className="size-[13px]" aria-hidden="true" />,
    netcdf: <FileJson className="size-[13px]" aria-hidden="true" />,
  };

  return (
    <div className="w-full min-w-0">
      {/* ══ TOP QUERY STRIP ═══════════════════════════════════ */}
      <div className="hud-panel corners relative mb-2 p-2.5">
        <span className="corner-b" aria-hidden="true" />

        {/* row 1 — title / chips / actions */}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink">
            DSN Archive Query Engine <span className="text-cy">{"//"}</span> Carrier Telemetry
          </h1>
          <Chip tone="gr" dot>
            BUFFER SYNC: REAL-TIME (EXP-0500)
          </Chip>
          <Chip tone="cy">RF COHERENCE: 7165.2 MHz [LOCK 99.8%]</Chip>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Btn
              icon={<Download className="size-[12px]" aria-hidden="true" />}
              onClick={() => {
                window.open("/api/mission/export/passes");
                useMission.getState().enqueueProduct("ORBIT_PASS_ARCHIVE", "CSV", 9.4);
                toast({ title: "ARCHIVE EXPORT STREAMED", description: "CSV / PARQUET BUNDLE — 1,482 RUNS" });
              }}
              aria-label="Download archive CSV or Parquet"
            >
              DOWNLOAD ARCHIVE CSV/PARQUET
            </Btn>
            <Btn
              icon={<RotateCcw className="size-[12px]" aria-hidden="true" />}
              onClick={() =>
                toast({
                  title: "PIPELINE BATCH RE-QUEUED",
                  description: "EXP-0500 // LoFTR + USAC — 8 PASSES RE-SCHEDULED ON CLUSTER A100-ISRO",
                })
              }
            >
              RE-RUN PIPELINE BATCH
            </Btn>
            <Btn
              variant="accent"
              icon={<GitCompare className="size-[12px]" aria-hidden="true" />}
              onClick={() =>
                toast({
                  title: "RUN DIFF LOADED",
                  description: "EXP-0450 ⇌ EXP-0500 — ΔRMSE −0.229 px SELECT RUNS TO COMPARE",
                })
              }
            >
              [COMPARE RUNS]
            </Btn>
          </div>
        </div>

        {/* row 2 — numbered query controls */}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <div className="min-w-[150px] flex-1">
            <Lbl className="mb-1 block text-cy/80">1. TARGET LUNAR BASIN</Lbl>
            <select
              className="hud-select w-full"
              value={basin}
              onChange={(e) => setBasin(e.target.value)}
              aria-label="Target lunar basin"
            >
              <option>SHACKLETON</option>
              <option>TYCHO</option>
              <option>BOGUSLAWSKY</option>
              <option>MARE TRANQUILLITATIS</option>
              <option>AMUNDSEN BASIN</option>
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <Lbl className="mb-1 block text-cy/80">2. SENSOR REGISTRATION BANK</Lbl>
            <select
              className="hud-select w-full"
              value={sensor}
              onChange={(e) => setSensor(e.target.value)}
              aria-label="Sensor registration bank"
            >
              <option>TMC-2 STEREO</option>
              <option>OHRC PAN 0.25M</option>
              <option>LOLA ALTIMETER</option>
              <option>SAR DUAL-POL</option>
            </select>
          </div>
          <div className="min-w-[140px] flex-1">
            <Lbl className="mb-1 block text-cy/80">3. REGISTRATION SOLVER</Lbl>
            <select
              className="hud-select w-full"
              value={solver}
              onChange={(e) => setSolver(e.target.value)}
              aria-label="Registration solver"
            >
              <option>LOFTR + USAC</option>
              <option>LOFTR + MAGSAC</option>
              <option>SIFT + RANSAC</option>
              <option>ORB + USAC</option>
            </select>
          </div>
          <div className="min-w-[170px] flex-1">
            <Lbl className="mb-1 block text-cy/80">4. EPOCH QUERY EXP-0400 → FRAME 0500</Lbl>
            <div className="hud-inset mono-tabular px-2 py-[6px] text-[10px] font-bold text-ink/85" aria-label="Epoch query range">
              2024.08.12 <span className="text-cy">&gt;</span> 2024.10.31
            </div>
          </div>
          <div className="min-w-[150px] flex-1">
            <Lbl className="mb-1 block text-cy/80">5. PARAMETER TELEMETRY FILTER</Lbl>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) setSelectedPass(filtered[0].passId);
              }}
              placeholder="PASS ID / RETURN"
              aria-label="Parameter telemetry filter — filter passes by ID or site"
              className="hud-inset w-full px-2 py-[6px] text-[10px] font-bold tracking-[0.08em] text-ink placeholder:font-semibold placeholder:text-faint focus:border-cy/60 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ══ BODY GRID ═════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
        {/* ── LEFT RAIL ─────────────────────────────────────── */}
        <div className="min-w-0 space-y-2 xl:col-span-3">
          {/* RF oscilloscope */}
          <Panel
            title="RF/OPTICAL CARRIER OSCILLOSCOPE"
            right={<Chip tone="gr">COHERENT 7.16 GHz</Chip>}
            className="min-w-0"
          >
            <div className="grid grid-cols-2 gap-1.5">
              <div className="hud-inset p-1.5">
                <Lbl className="block leading-tight">CARRIER FREQ</Lbl>
                <div className="mono-tabular text-[13px] font-extrabold text-cy text-glow-cy">{ARCHIVE.rf.carrier}</div>
              </div>
              <div className="hud-inset p-1.5">
                <Lbl className="block leading-tight">BANDWIDTH</Lbl>
                <div className="mono-tabular text-[13px] font-extrabold text-ink">{ARCHIVE.rf.bandwidth}</div>
              </div>
              <div className="hud-inset p-1.5">
                <Lbl className="block leading-tight">CARRIER-TO-NOISE (C/N0)</Lbl>
                <div className="mono-tabular text-[13px] font-extrabold text-ink">
                  {ARCHIVE.rf.cn0} <span className="text-[9px] text-faint">dB-Hz</span>
                </div>
              </div>
              <div className="hud-inset p-1.5">
                <Lbl className="block leading-tight">PHASE NOISE JITTER</Lbl>
                <div className="mono-tabular text-[13px] font-extrabold text-ink">{ARCHIVE.rf.phaseNoise}</div>
              </div>
            </div>

            <div className="mt-1.5 flex justify-center">
              <Chip tone="cy" className="text-[8px]">
                AUTO-TRIGGER: RF + PHASE REF: ACTIVE
              </Chip>
            </div>

            <div className="mt-1.5">
              <Oscilloscope />
            </div>

            <div className="mt-1.5 space-y-1">
              {ARCHIVE.channels.map((ch) => (
                <div key={ch.ch} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-[6px] shrink-0 rounded-[1px]"
                      style={{ background: ch.color, boxShadow: `0 0 6px ${ch.color}99` }}
                    />
                    <span className="text-[8.5px] font-bold text-faint">{ch.ch}</span>
                    <span className="truncate text-[9px] font-bold uppercase tracking-[0.06em] text-dim">
                      {ch.label}
                    </span>
                  </span>
                  <span className="mono-tabular shrink-0 text-[8.5px] font-bold text-ink/75">{ch.note}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* benchmarks */}
          <Panel title="PIPELINE RUN BENCHMARKS" right={<Chip>LUNAR 2.0.4</Chip>}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <Stat
                label="TOTAL RUNS LOGGED"
                value={ARCHIVE.benchmarks.totalRuns}
                sub={<span className="text-gr">+40 LAST 24H</span>}
                tone="cy"
                size="md"
              />
              <Stat
                label="NOMINAL CONV"
                value={ARCHIVE.benchmarks.nominal}
                sub={`THRESHOLD: ${ARCHIVE.benchmarks.threshold}`}
                tone="gr"
                size="md"
              />
              <Stat
                label="MEAN RMSE"
                value={`${ARCHIVE.benchmarks.meanRmse} px`}
                sub="SUB-PIXEL VERIFIED"
                size="md"
              />
              <Stat
                label="AREA MAPPED"
                value={`${ARCHIVE.benchmarks.area} km²`}
                sub="CONSOLIDATED"
                size="md"
              />
            </div>
          </Panel>

          {/* convergence sparkline */}
          <Panel title="CONVERGENCE ACCURACY OVER TIME WINDOW" right={<Chip>100 ORBIT</Chip>}>
            <Sparkline points={[0.45, 0.31, 0.22, 0.16, 0.12, 0.091]} tone="#2dd9ec" dots height={54} />
            <div className="mono-tabular mt-1 flex justify-between text-[8px] tracking-[0.1em]">
              <span className="text-faint">EXP-0400 (INIT)</span>
              <span className="text-faint">EXP-0450</span>
              <span className="font-bold text-cy">EXP-0500 (CURRENT)</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Chip tone="am" className="text-[8px]">
                0.45 PX COARSE
              </Chip>
              <span className="text-[9px] text-faint" aria-hidden="true">
                →
              </span>
              <Chip tone="gr" dot className="text-[8px]">
                0.091 PX HIGH-RES LOCK
              </Chip>
              <Chip tone="gr" className="text-[8px]">
                STABLE 0.09 PX
              </Chip>
            </div>
          </Panel>

          {/* hardware & compute */}
          <Panel title="HARDWARE & COMPUTE" right={<Chip>CLUSTER {ARCHIVE.cluster.name}</Chip>}>
            <div className="space-y-2.5">
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Lbl>GPU VRAM (ADA)</Lbl>
                  <span className="mono-tabular text-[9.5px] font-bold text-ink/85">
                    {ARCHIVE.cluster.vram.used.toFixed(1)} / {ARCHIVE.cluster.vram.total.toFixed(1)} GB
                  </span>
                </div>
                <Bar pct={ARCHIVE.cluster.vram.pct} tone="cy" segments={10} />
              </div>
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Lbl>TENSOR CORE OCCUPANCY</Lbl>
                  <span className="mono-tabular text-[9.5px] font-bold text-ink/85">
                    {ARCHIVE.cluster.tensor.pct}% <span className="text-faint">· {ARCHIVE.cluster.tensor.note}</span>
                  </span>
                </div>
                <Bar pct={ARCHIVE.cluster.tensor.pct} tone="gr" segments={10} />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <Lbl>EPHEMERIS CLOCK DRIFT (MASER LOCK)</Lbl>
                <span className="mono-tabular text-[10px] font-extrabold text-gr text-glow-gr">
                  {ARCHIVE.cluster.drift}
                </span>
              </div>
            </div>
          </Panel>

          {/* pearson correlation matrix */}
          <Panel title="CROSS-SENSOR PEARSON CORRELATION" right={<Chip tone="cy">ρ</Chip>}>
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr>
                  <th className="label-micro px-1 pb-1 text-left" aria-label="Correlation matrix" />
                  {ARCHIVE.correlation.axes.map((a) => (
                    <th key={a} className="label-micro px-1 pb-1 text-center font-bold text-dim">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ARCHIVE.correlation.matrix.map((row, r) => (
                  <tr key={ARCHIVE.correlation.axes[r]}>
                    <th className="label-micro px-1 py-[3px] text-left font-bold text-dim">
                      {ARCHIVE.correlation.axes[r]}
                    </th>
                    {row.map((v, c) => (
                      <td
                        key={c}
                        className={cn(
                          "mono-tabular px-1 py-[3px] text-center transition-colors hover:bg-raise2",
                          corrClass(v)
                        )}
                        title={`${ARCHIVE.correlation.axes[r]} × ${ARCHIVE.correlation.axes[c]} = ${v.toFixed(2)}`}
                      >
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* ── CENTER ────────────────────────────────────────── */}
        <div className="min-w-0 space-y-2 xl:col-span-6">
          {/* orbit pass register */}
          <Panel
            title="ORBIT PASS REGISTER"
            corners
            right={
              <div className="hidden items-center gap-1.5 md:flex">
                <Chip tone="cy">ACTIVE SENSOR: CH2 TMC-2 // OHRC</Chip>
                <Chip tone="gr" dot>
                  HOMOGRAPHY MAGSAC: LOCKED
                </Chip>
              </div>
            }
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Lbl>
                SHOWING {filtered.length} OF 1,482 ORBIT PASSES
                {query.trim() ? ` · FILTER “${query.trim().toUpperCase()}”` : ""}
                {flagOnly ? " · FLAGGED SUBSET" : ""}
              </Lbl>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`label-micro hidden lg:block ${rowA || rowB ? "text-cy/90" : "text-faint"}`}
                  aria-live="polite"
                >
                  CMP {rowA ? `A:${rowA.passId}` : "A:—"} · {rowB ? `B:${rowB.passId}` : "B:—"}
                </span>
                <button
                  type="button"
                  onClick={() => setFlagOnly((v) => !v)}
                  aria-pressed={flagOnly}
                  className={`flex items-center gap-1 border-b border-dashed pb-px text-[9px] font-bold uppercase tracking-[0.1em] transition-colors ${
                    flagOnly ? "border-am/70 text-am" : "border-line2 text-dim hover:text-cy"
                  }`}
                >
                  <Star className={`size-[9px] ${flagOnly ? "fill-am text-am" : ""}`} aria-hidden="true" />
                  FLAGGED ONLY
                </button>
                <button
                  type="button"
                  onClick={() => setSortDesc((d) => !d)}
                  aria-label="Toggle pass sort order"
                  className="label-micro shrink-0 border-b border-dashed border-line2 pb-px text-dim transition-colors hover:text-cy"
                >
                  SORT: {sortDesc ? "RECENT PASS" : "OLDEST PASS"} {sortDesc ? "⌄" : "⌃"}
                </button>
              </div>
            </div>

            <div className="hud-inset max-h-[430px] overflow-auto" role="region" aria-label="Orbit pass register table">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr>
                    {["PASS ID & EPOCH (UTC)", "TARGET SITE & LAT/LON", "SENSORS", "INLIER RATIO", "RMSE", "PSNR // SSIM"].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="label-micro sticky top-0 z-10 border-b border-line bg-[#0b1017] px-2 py-1.5 text-left"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const active = p.passId === sel.passId;
                    return (
                      <tr
                        key={p.passId}
                        tabIndex={0}
                        role="button"
                        aria-pressed={active}
                        aria-label={`Select ${p.passId} — ${p.siteName}`}
                        onClick={() => setSelectedPass(p.passId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedPass(p.passId);
                          }
                        }}
                        className={cn(
                          "group/tr cursor-pointer border-b border-line/50 outline-none transition-colors",
                          active
                            ? "bg-raise"
                            : p.flagged
                              ? "bg-rd/[0.05] hover:bg-rd/[0.09]"
                              : "hover:bg-raise/60"
                        )}
                        style={active ? { boxShadow: "inset 2px 0 0 #2dd9ec" } : undefined}
                      >
                        <td className="px-2 py-1.5">
                          <span className="flex items-center gap-1">
                            <span className={cn("text-[10px] font-extrabold tracking-[0.04em]", active ? "text-cy" : "text-ink")}>
                              {p.passId}
                            </span>
                            <button
                              type="button"
                              aria-label={p.flagged ? `Clear review flag on ${p.passId}` : `Flag ${p.passId} for review`}
                              aria-pressed={p.flagged}
                              title={p.flagged ? "Clear review flag" : "Flag for operator review"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFlag(p);
                              }}
                              className={cn(
                                "rounded-[2px] p-[2px] transition-colors",
                                p.flagged
                                  ? "text-am hover:text-rd"
                                  : "text-faint/50 opacity-0 hover:text-am focus-visible:opacity-100 group-hover/tr:opacity-100 [tr:hover_&]:opacity-100",
                                flagBusy === p.passId && "animate-pulse"
                              )}
                            >
                              <Star className={cn("size-[10px]", p.flagged && "fill-am")} aria-hidden="true" />
                            </button>
                            {(["A", "B"] as const).map((slot) => {
                              const pinned = (slot === "A" ? pinA : pinB) === p.passId;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  aria-label={pinned ? `Unpin ${p.passId} from comparator slot ${slot}` : `Pin ${p.passId} to comparator slot ${slot}`}
                                  aria-pressed={pinned}
                                  title={pinned ? `Unpin slot ${slot}` : `Pin to comparator slot ${slot}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    pinCompare(slot, p);
                                  }}
                                  className={cn(
                                    "mono-tabular size-[13px] shrink-0 rounded-[2px] border text-[7.5px] font-black leading-none transition-all",
                                    pinned
                                      ? slot === "A"
                                        ? "border-cy/70 bg-cy/15 text-cy shadow-[0_0_6px_rgba(45,217,236,0.35)]"
                                        : "border-gr/70 bg-gr/15 text-gr shadow-[0_0_6px_rgba(70,224,143,0.35)]"
                                      : "border-line2 bg-[#0a0f16] text-faint/60 opacity-0 hover:border-cy/50 hover:text-cy focus-visible:opacity-100 group-hover/tr:opacity-100 [tr:hover_&]:opacity-100"
                                  )}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                            {p.flagged && (
                              <TriangleAlert className="size-[9px] text-rd" aria-label="Pass flagged for review" />
                            )}
                          </span>
                          <span className="mono-tabular block text-[8.5px] text-faint">{p.epoch} UTC</span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="block truncate text-[9.5px] font-bold uppercase text-ink/90">{p.siteName}</span>
                          <span className="mono-tabular block text-[8.5px] text-faint">
                            {p.lat} · {p.lon}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="text-[9px] font-bold tracking-[0.04em] text-cy/80">
                            {p.sensorA} <span className="text-faint">⇌</span> {p.sensorB}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={cn("mono-tabular text-[10px] font-extrabold", ratioTone(p.inlierRatio))}>
                            {p.inlierRatio.toFixed(1)}%
                          </span>
                          <span className="mono-tabular block text-[8.5px] text-faint">
                            {p.inliersMatched.toLocaleString()}/{p.inliersTotal.toLocaleString()}
                          </span>
                        </td>
                        <td className="mono-tabular px-2 py-1.5 text-[10px] font-bold text-ink/85">{p.rmse.toFixed(2)} px</td>
                        <td className="px-2 py-1.5">
                          <span className="mono-tabular block text-[9.5px] font-bold text-ink/85">
                            +{p.psnr.toFixed(2)} dB
                          </span>
                          <span className="mono-tabular block text-[8.5px] text-faint">{p.ssim.toFixed(3)}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-6 text-center text-[9.5px] font-bold tracking-[0.12em] text-faint">
                        NO PASSES MATCH QUERY — CLEAR TELEMETRY FILTER
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* A/B register comparator */}
          {rowA && rowB && (
            <Panel
              title="REGISTER DELTA // A/B COMPARATOR"
              right={
                <button
                  type="button"
                  onClick={() => {
                    setPinA(null);
                    setPinB(null);
                    toast({ title: "COMPARATOR CLEARED", description: "Both slots released." });
                  }}
                  className="label-micro border-b border-dashed border-line2 pb-px text-dim transition-colors hover:text-rd"
                  aria-label="Clear comparator slots"
                >
                  CLEAR SLOTS ✕
                </button>
              }
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="mono-tabular border border-cy/50 bg-cy/10 px-1.5 py-px text-[8.5px] font-black text-cy">A · {rowA.passId}</span>
                <span className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-faint">{rowA.siteName}</span>
                <span className="text-faint mx-0.5">⇌</span>
                <span className="mono-tabular border border-gr/50 bg-gr/10 px-1.5 py-px text-[8.5px] font-black text-gr">B · {rowB.passId}</span>
                <span className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-faint">{rowB.siteName}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
                {(() => {
                  const metrics: Array<{ k: string; a: number; b: number; fmt: (v: number) => string; hi: boolean }> = [
                    { k: "INLIER RATIO", a: rowA.inlierRatio, b: rowB.inlierRatio, fmt: (v) => `${v.toFixed(1)}%`, hi: true },
                    { k: "RMSE", a: rowA.rmse, b: rowB.rmse, fmt: (v) => `${v.toFixed(2)} px`, hi: false },
                    { k: "PSNR", a: rowA.psnr, b: rowB.psnr, fmt: (v) => `+${v.toFixed(2)} dB`, hi: true },
                    { k: "SSIM", a: rowA.ssim, b: rowB.ssim, fmt: (v) => v.toFixed(3), hi: true },
                    { k: "MATCH YIELD", a: (rowA.inliersMatched / rowA.inliersTotal) * 100, b: (rowB.inliersMatched / rowB.inliersTotal) * 100, fmt: (v) => `${v.toFixed(1)}%`, hi: true },
                  ];
                  /* archive percentile — where does each pinned pass sit across the full register */
                  const pct = (v: number, pick: (p: PassRow) => number, hi: boolean) => {
                    const vals = passes.map(pick);
                    const below = vals.filter((x) => (hi ? x < v : x > v)).length;
                    return Math.round((below / Math.max(1, vals.length)) * 100);
                  };
                  return metrics.map((m) => {
                    const d = m.a - m.b;
                    const aBetter = m.hi ? d > 0 : d < 0;
                    const flat = Math.abs(d) < 1e-9;
                    const pick = m.k === "MATCH YIELD" ? (p: PassRow) => (p.inliersMatched / p.inliersTotal) * 100
                      : m.k === "INLIER RATIO" ? (p: PassRow) => p.inlierRatio
                      : m.k === "RMSE" ? (p: PassRow) => p.rmse
                      : m.k === "PSNR" ? (p: PassRow) => p.psnr
                      : (p: PassRow) => p.ssim;
                    const pa = pct(m.a, pick, m.hi);
                    const pb = pct(m.b, pick, m.hi);
                    return (
                      <div key={m.k} className="hud-inset min-w-0 p-1.5">
                        <Lbl className="block leading-tight">{m.k}</Lbl>
                        <div className="mt-0.5 flex items-baseline justify-between gap-1">
                          <span className="mono-tabular text-[9.5px] font-extrabold text-cy">{m.fmt(m.a)}</span>
                          <span className="mono-tabular text-[9.5px] font-extrabold text-gr">{m.fmt(m.b)}</span>
                        </div>
                        <div className={`mono-tabular mt-0.5 text-[8.5px] font-bold ${flat ? "text-faint" : aBetter ? "text-cy" : "text-am"}`}>
                          Δ {d >= 0 ? "+" : ""}{m.k === "RMSE" ? d.toFixed(3) : m.fmt(Math.abs(d)).replace("+", "")}{" "}
                          {flat ? "· PARITY" : aBetter ? "A△" : "B▲"}
                        </div>
                        {/* archive percentile track — right edge = register-best */}
                        <div
                          className="relative mt-1 h-[5px] rounded-full bg-[#0d131c] ring-1 ring-line/60"
                          title={`Archive percentile — A P${pa} · B P${pb} (${passes.length} passes)`}
                          aria-hidden="true"
                        >
                          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-line2 via-line2/60 to-cy/30" />
                          <span
                            className="absolute top-1/2 size-[7px] -translate-y-1/2 rounded-full border border-[#05272e] bg-cy shadow-[0_0_5px_#2dd9ec] transition-[left] duration-300"
                            style={{ left: `calc(${pa}% - 3px)` }}
                          />
                          <span
                            className="absolute top-1/2 size-[7px] -translate-y-1/2 rounded-full border border-[#04160c] bg-gr shadow-[0_0_5px_#46e08f] transition-[left] duration-300"
                            style={{ left: `calc(${pb}% - 3px)` }}
                          />
                        </div>
                        <div className="mono-tabular mt-0.5 flex justify-between text-[7.5px] font-bold text-faint">
                          <span>A P{pa}</span>
                          <span>B P{pb}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* verdict strip */}
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-line/60 pt-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-faint">
                  ARCHIVE CONTEXT · {passes.length} PASSES · TRACKS POSITION REGISTER-WIDE (RIGHT = BEST)
                </span>
                <span
                  className={`mono-tabular text-[8.5px] font-black uppercase tracking-[0.1em] ${
                    !verdict || verdict.a === verdict.b ? "text-faint" : verdict.a > verdict.b ? "text-cy" : "text-gr"
                  }`}
                  aria-live="polite"
                >
                  {!verdict || verdict.a === verdict.b
                    ? "VERDICT · PARITY"
                    : verdict.a > verdict.b
                      ? `VERDICT · SLOT A LEADS ${verdict.a}/${verdict.total}`
                      : `VERDICT · SLOT B LEADS ${verdict.b}/${verdict.total}`}
                </span>
              </div>
            </Panel>
          )}

          {/* inspector */}
          <Panel
            title={
              <>
                INSPECTOR: {sel.passId} <span className="text-cy">{"//"}</span> {sel.siteName}
              </>
            }
            right={
              <div className="hidden items-center gap-1.5 md:flex">
                <Chip tone="cy">{sel.sensorA} STEREO ⇌ {sel.sensorB} 0.25M</Chip>
                {sel.flagged || sel.status === "FLAGGED" ? (
                  <Chip tone="am" dot>REVIEW QUEUE</Chip>
                ) : sel.status === "REVIEW" ? (
                  <Chip tone="cy">RE-SOLVER PENDING</Chip>
                ) : (
                  <Chip tone="gr">HOMOGRAPHY VALID</Chip>
                )}
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* left: dispersion map + homography */}
              <div className="min-w-0">
                <SubHead right={<Lbl>RES 0.25 M/PX</Lbl>}>KEYPOINT DISPERSION MAP</SubHead>
                <div className="hud-inset relative h-28 overflow-hidden">
                  <Image
                    src="/imagery/crater-optical.png"
                    alt={`Optical crater imagery for ${sel.siteName}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover opacity-80 grayscale"
                  />
                  <div className="absolute inset-0" aria-hidden="true">
                    {KP_DOTS.map((d, i) => (
                      <span
                        key={i}
                        className="absolute animate-pulse rounded-full"
                        style={{
                          left: `${d.x}%`,
                          top: `${d.y}%`,
                          width: d.r * 2,
                          height: d.r * 2,
                          background: d.green ? "#46e08f" : "#2dd9ec",
                          boxShadow: `0 0 4px ${d.green ? "#46e08f" : "#2dd9ec"}`,
                          animationDelay: `${d.delay}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="absolute left-[20%] top-[16%] h-[62%] w-[52%] border border-cy/70"
                    aria-hidden="true"
                  >
                    <span className="absolute -left-px -top-px size-[6px] border-l border-t border-cy" />
                    <span className="absolute -right-px -top-px size-[6px] border-r border-t border-cy" />
                    <span className="absolute -bottom-px -left-px size-[6px] border-b border-l border-cy" />
                    <span className="absolute -bottom-px -right-px size-[6px] border-b border-r border-cy" />
                    <span className="absolute -top-[13px] left-0 text-[7.5px] font-bold tracking-[0.14em] text-cy">
                      ROI · H(3×3) LOCK
                    </span>
                  </div>
                </div>

                <SubHead className="mt-3">HOMOGRAPHY USAC-MAGSAC H(3×3)</SubHead>
                <Code>
                  <div className="flex justify-between gap-1">
                    <span>+0.99842</span>
                    <span>−0.01240</span>
                    <span>+4.0118</span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span>+0.01180</span>
                    <span>+0.99915</span>
                    <span>−6.3140</span>
                  </div>
                  <div className="flex justify-between gap-1 text-dim">
                    <span>+1.20e-3</span>
                    <span>3.10e-4</span>
                    <span className="text-cy">1.00</span>
                  </div>
                </Code>
              </div>

              {/* right: match yield */}
              <div className="min-w-0">
                <SubHead right={<Lbl>2-VIEW GEOM</Lbl>}>KEYPOINT MATCH YIELD</SubHead>
                <div className="hud-inset mb-2 p-2">
                  <Stat
                    label="M-ESTIMATOR CONSENSUS"
                    value={`${sel.inlierRatio.toFixed(1)}% INLIER`}
                    tone="gr"
                    size="lg"
                    sub={`${sel.status} · USAC-MAGSAC THRESH τ = 2.5 PX`}
                  />
                </div>

                <div className="space-y-2">
                  {[
                    { k: "DETECTED (LoFTR)", v: detected.toLocaleString(), pct: 100, tone: "cy" as const },
                    { k: "CANDIDATE PAIRS", v: candidates.toLocaleString(), pct: (candidates / detected) * 100, tone: "cy" as const },
                    { k: "FILTERED MATCHES", v: sel.inliersTotal.toLocaleString(), pct: (sel.inliersTotal / detected) * 100, tone: "gr" as const },
                    { k: "M-ESTIMATOR INLIERS", v: sel.inliersMatched.toLocaleString(), pct: (sel.inliersMatched / detected) * 100, tone: "gr" as const },
                  ].map((r) => (
                    <div key={r.k}>
                      <div className="mb-[3px] flex items-baseline justify-between gap-2">
                        <Lbl>{r.k}</Lbl>
                        <span className="mono-tabular text-[9.5px] font-bold text-ink/85">{r.v}</span>
                      </div>
                      <Bar pct={r.pct} tone={r.tone} segments={10} />
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                  <div className="hud-inset p-1.5">
                    <Lbl className="block leading-tight">COND NUMBER</Lbl>
                    <div className="mono-tabular text-[12px] font-extrabold text-ink">1.04</div>
                  </div>
                  <div className="hud-inset p-1.5">
                    <Lbl className="block leading-tight">DET</Lbl>
                    <div className="mono-tabular text-[12px] font-extrabold text-cy">+0.9981</div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* ── RIGHT RAIL ────────────────────────────────────── */}
        <div className="min-w-0 space-y-2 xl:col-span-3">
          {/* accuracy distribution */}
          <Panel title="ACCURACY DISTRIBUTION" right={<Chip tone="cy">N=1,482</Chip>}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Lbl>TMC-2 STEREO vs OHRC OPTICAL</Lbl>
            </div>
            <Lbl className="mb-1.5 block">SUB-PIXEL ERROR METRIC (PIXELS)</Lbl>
            <Histogram
              bins={[18, 42, 64, 38, 14, 4]}
              labels={["<0.05", ">0.25"]}
              height={74}
              toneFor={(i) =>
                ["#ffb454", "#2dd9ec", "#46e08f", "#2dd9ec", "#b18cff", "#ff5d5d"][i] ?? "#2dd9ec"
              }
            />
            <div className="mono-tabular mt-0.5 flex justify-around px-5 text-[8px] tracking-[0.1em] text-faint">
              <span>0.08</span>
              <span>·</span>
              <span className="text-gr">0.11</span>
              <span>·</span>
              <span>0.14</span>
              <span>·</span>
              <span>0.18</span>
            </div>
          </Panel>

          {/* incident log */}
          <Panel title="OPERATIONAL INCIDENT LOG" right={<Chip tone="am" dot>3 FLAGS</Chip>}>
            <div className="space-y-1.5">
              {incidents.slice(0, 3).map((inc) => (
                <div
                  key={`${inc.pass}-${inc.title}`}
                  className="border border-line bg-raise/40 p-2"
                  style={{ borderLeft: `2px solid ${sevBorder[inc.severity] ?? "#2dd9ec"}` }}
                >
                  <div className="flex items-center gap-1.5">
                    <Chip tone={sevChip[inc.severity] ?? "cy"} className="text-[8px]">
                      {inc.severity}
                    </Chip>
                    <Chip className="text-[8px]">{inc.tag}</Chip>
                  </div>
                  <div className="mt-1 truncate text-[9.5px] font-extrabold tracking-[0.06em] text-ink">
                    {inc.pass} {"//"} {inc.title}
                  </div>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-dim">{inc.body}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* export presets */}
          <Panel title="PLANETARY EXPORT PRESETS" right={<Chip>PDS4 / ISSDC</Chip>}>
            <div className="grid grid-cols-2 gap-1.5">
              {ARCHIVE.exports.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    useMission.getState().enqueueProduct(`${ex.label.toUpperCase().replace(/\s+/g, "_")}_BUNDLE`, "XML", 32.5);
                    toast({ title: "EXPORT QUEUED", description: `${ex.label.toUpperCase()} — PDS4 COMPLIANT BUNDLE` });
                  }}
                  aria-label={`Export ${ex.label}`}
                  className="hud-btn h-auto flex-col gap-1 py-2 text-[9px] hover:border-cy/50 hover:text-cy"
                >
                  {exportIcons[ex.icon] ?? <Box className="size-[13px]" aria-hidden="true" />}
                  <span className="truncate">{ex.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-1.5 space-y-1.5">
              <Btn
                full
                variant="ghost"
                icon={<FileText className="size-[12px]" aria-hidden="true" />}
                onClick={() =>
                  toast({ title: "MISSION REPORT COMPILED", description: "14 SECTIONS — PDF/JSON BUNDLE READY FOR REVIEW" })
                }
              >
                [GENERATE MISSION REPORT (PDF/JSON)]
              </Btn>
              <Btn
                full
                variant="accent"
                icon={<UploadCloud className="size-[12px]" aria-hidden="true" />}
                onClick={() =>
                  toast({ title: "SYNC QUEUE: 2 PRODUCTS", description: "NASA PDS / ISRO ISSDC UPLINK ACKNOWLEDGED — TRANSFER 41.2 GB" })
                }
              >
                [SYNC TO NASA PDS / ISRO ISSDC]
              </Btn>
            </div>
          </Panel>

          {/* carrier spectrum */}
          <Panel title="CARRIER SPECTRUM" right={<Chip tone="cy">IF 45.0 MHz</Chip>}>
            <div className="flex h-11 items-end gap-[2px]" role="img" aria-label="Carrier spectrum analyzer, 24 banks">
              {SPEC_BARS.map((hgt, i) => (
                <div
                  key={i}
                  className="flex-1 animate-pulse rounded-t-[1px]"
                  style={{
                    height: `${hgt}%`,
                    background: "linear-gradient(180deg,#2dd9ec,#46e08f)",
                    opacity: 0.3 + (hgt / 130) * 0.7,
                    animationDelay: `${((i * 0.13) % 1.5).toFixed(2)}s`,
                    animationDuration: `${(1.1 + (i % 5) * 0.22).toFixed(2)}s`,
                  }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between">
              <Lbl>7145 MHz</Lbl>
              <Lbl>RF·IF BANK</Lbl>
              <Lbl>7185 MHz</Lbl>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
