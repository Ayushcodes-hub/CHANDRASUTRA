"use client";

/**
 * LUNARMATCH 2.0 — 3D DEM SYNTHESIS console
 * Shackleton Quad-01 terrain stage: three.js heightfield viewport (shaded relief /
 * wireframe / point cloud / contour overlay), synthesis pipeline, geodata export.
 */
import * as React from "react";
import * as THREE from "three";
import {
  Mountain,
  Box,
  Grip,
  ScanLine,
  Image as ImageIcon,
  CloudDownload,
  FileJson,
  Camera,
  type LucideIcon,
} from "lucide-react";
import { Panel, Lbl, Chip, KV, Stat, Btn, Seg, Tick, Bar } from "@/components/hud/primitives";
import { Gauge } from "@/components/hud/Gauge";
import { Histogram } from "@/components/hud/charts";
import { DEM } from "@/lib/mission-data";
import { useMission } from "@/lib/mission-store";
import { useToast } from "@/hooks/use-toast";

/* ── math helpers ───────────────────────────────────────────── */
const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const hash2 = (x: number, y: number): number => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
const vnoise = (x: number, y: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number): number =>
  0.62 * vnoise(x, y) + 0.26 * vnoise(x * 2.13 + 7.3, y * 2.13 + 3.1) + 0.12 * vnoise(x * 4.31 + 13.7, y * 4.31 + 9.2);

/** Shackleton profile — parabolic floor (r<0.55R), smooth wall, +1.1 raised rim, exterior ripples. */
function craterHeight(x: number, y: number, R: number): number {
  const r = Math.hypot(x, y) / R;
  let h: number;
  if (r < 0.55) h = -4.3 + 0.95 * (r / 0.55) ** 2;
  else if (r < 1) h = -3.35 * (0.5 + 0.5 * Math.cos(Math.PI * ((r - 0.55) / 0.45)));
  else h = 0;
  h += 1.1 * Math.exp(-(((r - 0.97) / 0.16) ** 2)); // raised rim crest ≈ +1.1
  if (r > 0.9) {
    // noise ripples on the ejecta apron + gentle regional falloff
    const decay = Math.exp(-Math.max(0, r - 1) * 1.5);
    h += (fbm(x * 0.52 + 3.7, y * 0.52 + 1.3) - 0.5) * 1.05 * decay;
    h -= Math.max(0, r - 1) * 0.6;
  }
  h += (fbm(x * 1.8 + 11.2, y * 1.8 + 5.9) - 0.5) * (r < 0.6 ? 0.16 : 0.34);
  return h;
}

/* hypsometric vertex ramp: floor nadir → wall → terrace → rim crest */
const RAMP: ReadonlyArray<readonly [number, string]> = [
  [0, "#143a7e"],
  [0.45, "#2d6f9e"],
  [0.62, "#4f9f92"],
  [0.8, "#d8a25e"],
  [1, "#ffb454"],
];
const RAMP_COLORS = RAMP.map(([, c]) => new THREE.Color(c));
function rampColor(out: THREE.Color, t: number): void {
  let i = 1;
  while (i < RAMP.length - 1 && t > RAMP[i][0]) i++;
  const t0 = RAMP[i - 1][0];
  const t1 = RAMP[i][0];
  out.copy(RAMP_COLORS[i - 1]).lerp(RAMP_COLORS[i], clampN((t - t0) / (t1 - t0 || 1), 0, 1));
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * t));
  const g = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t));
  const bl = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

/* elevation histogram — bimodal: rim mass (amber→cyan) | floor mass (blue) */
const ELEV_BINS = [14, 32, 36, 22, 9, 4, 5, 12, 24, 34, 30, 14];
const elevTone = (i: number, n: number): string => {
  const half = n / 2;
  return i < half
    ? lerpHex("#ffb454", "#2dd9ec", i / (half - 1))
    : lerpHex("#2d6f9e", "#143a7e", (i - half) / (n - half - 1));
};

/* ── scene handles shared with reactive effects ─────────────── */
interface SceneHandles {
  mesh: THREE.Mesh;
  wire: THREE.Mesh;
  points: THREE.Points;
  contourGrid: THREE.Object3D;
  graticule: THREE.Object3D;
  shadedMat: THREE.MeshStandardMaterial;
  baseH: Float32Array;
  geom: THREE.BufferGeometry;
  pGeom: THREE.BufferGeometry;
}

type ViewMode = "relief" | "wire" | "points" | "contour";

const EXPORTS: { label: string; icon: LucideIcon; file: string }[] = [
  { label: "GEOTIFF 32-BIT", icon: ImageIcon, file: "shackleton_quad01_dem.tif" },
  { label: "LAS 1.4 CLOUD", icon: CloudDownload, file: "shackleton_quad01_pts.las" },
  { label: "HDF5 TENSOR", icon: Box, file: "shackleton_dem_tensor.h5" },
  { label: "NETCDF-4 GRID", icon: FileJson, file: "shackleton_dem_grid.nc" },
];

const MESH_STATS: { label: string; value: string; sub: string; tone: "cy" | "ink" | "gr" | "am" }[] = [
  { label: "VERTICES", value: DEM.stats.vertices, sub: "GRID 129 × 129", tone: "cy" },
  { label: "TRIANGLES", value: DEM.stats.triangles, sub: "INDEXED 2.5D DELAUNAY", tone: "ink" },
  { label: "PRECISION", value: DEM.stats.precision, sub: "LOLA COREGISTered", tone: "gr" },
  { label: "POINT CLOUD", value: DEM.stats.cloud, sub: "LOD DECIM PASS-1", tone: "am" },
];

export default function DemSynthesis() {
  const { toast } = useToast();
  const live = useMission((s) => s.live);
  const wireframe = useMission((s) => s.wireframe);
  const toggleWireframe = useMission((s) => s.toggleWireframe);

  const [mode, setMode] = React.useState<ViewMode>("relief");
  const [ve3, setVe3] = React.useState(true);
  const [grat, setGrat] = React.useState(true);
  const [scatter, setScatter] = React.useState(false);
  const [exportPct, setExportPct] = React.useState<number | null>(null);
  const [exportDone, setExportDone] = React.useState(false);
  const [flash, setFlash] = React.useState(false);

  const hostRef = React.useRef<HTMLDivElement>(null);
  const camRef = React.useRef<HTMLSpanElement>(null);
  const sceneRef = React.useRef<SceneHandles | null>(null);

  /* capture-frame — snapshot the live WebGL stage into a downloadable PNG plate */
  const captureFrame = () => {
    const canvas = hostRef.current?.querySelector("canvas");
    if (!canvas) {
      toast({ title: "CAPTURE FAILED", description: "Terrain stage not mounted." });
      return;
    }
    const met = useMission.getState().live.met;
    const modeLabel = mode.toUpperCase();
    /* composite onto an offscreen plate with mission HUD burn-in */
    const plate = document.createElement("canvas");
    plate.width = canvas.width;
    plate.height = canvas.height;
    const ctx = plate.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#070b11";
    ctx.fillRect(0, 0, plate.width, plate.height);
    ctx.drawImage(canvas, 0, 0);
    const fs = Math.max(11, Math.round(plate.height * 0.022));
    ctx.font = `700 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillStyle = "rgba(45,217,236,0.92)";
    ctx.fillText(`LUNARMATCH 2.0 // DEM QUAD-01 · ${modeLabel}`, fs * 0.8, plate.height - fs * 1.7);
    ctx.fillStyle = "rgba(127,147,168,0.85)";
    ctx.font = `500 ${fs * 0.8}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(`T+${String(met).padStart(5, "0")}S · SRC TMC-2 STEREO + LOLA WARP · SHACKLETON 89.9°S`, fs * 0.8, plate.height - fs * 0.7);
    /* reticle burn-in */
    const cx = plate.width / 2;
    const cy = plate.height / 2;
    const r = plate.height * 0.16;
    ctx.strokeStyle = "rgba(45,217,236,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
    const a = document.createElement("a");
    a.href = plate.toDataURL("image/png");
    a.download = `lunarmatch-dem-frame-t${met}-${mode.toLowerCase()}.png`;
    a.click();
    setFlash(true);
    setTimeout(() => setFlash(false), 340);
    useMission.getState().logEvent("DATA", `DEM FRAME CAPTURED · ${modeLabel}`, `PLATE ${plate.width}×${plate.height} · MET T+${met}S`, "dem");
    useMission.getState().enqueueProduct(`DEM_FRAME_${modeLabel}_T${met}`, "PNG", 4.7);
    toast({ title: "FRAME CAPTURED", description: `${modeLabel} plate written — PNG queued to downlink.` });
  };

  /* ── three.js stage (mount once) ──────────────────────────── */
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x070b11, 17, 32);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);

    /* lighting — solar ephemeris: AZ 45° / EL 18° grazing key + faint cyan fill */
    const key = new THREE.DirectionalLight(0xfff0d8, 2.7);
    {
      const azr = (45 * Math.PI) / 180;
      const elr = (18 * Math.PI) / 180;
      const d = 22;
      key.position.set(d * Math.cos(elr) * Math.cos(azr), d * Math.sin(elr), d * Math.cos(elr) * Math.sin(azr));
    }
    const fill = new THREE.DirectionalLight(0x2dd9ec, 0.38);
    fill.position.set(-9, 5, -7);
    scene.add(key, fill, new THREE.AmbientLight(0x38465a, 0.55));

    /* 128×128 heightfield — displaced Shackleton crater */
    const SEG = 128;
    const SIZE = 10;
    const RC = 4.0;
    const geom = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    const baseH = new Float32Array(n);
    let hMin = Infinity;
    let hMax = -Infinity;
    for (let i = 0; i < n; i++) {
      // authored relief ÷3 — the ×3 VERTICAL EXAGGERATION tick restores spec depth
      const h = craterHeight(pos.getX(i), pos.getY(i), RC) / 3;
      baseH[i] = h;
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
    const colors = new Float32Array(n * 3);
    const cTmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      rampColor(cTmp, (baseH[i] - hMin) / (hMax - hMin || 1));
      colors[i * 3] = cTmp.r;
      colors[i * 3 + 1] = cTmp.g;
      colors[i * 3 + 2] = cTmp.b;
      pos.setZ(i, baseH[i]); // plane z → +Y after rotateX
    }
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.rotateX(-Math.PI / 2);
    geom.computeVertexNormals();

    const shadedMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.94,
      metalness: 0.05,
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x2dd9ec,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, shadedMat);
    const wire = new THREE.Mesh(geom, wireMat);
    wire.visible = false;
    scene.add(mesh, wire);

    /* point cloud — cyan→green per-vertex ramp */
    const pGeom = geom.clone();
    const pCols = new Float32Array(n * 3);
    const cLo = new THREE.Color("#2dd9ec");
    const cHi = new THREE.Color("#46e08f");
    for (let i = 0; i < n; i++) {
      cTmp.copy(cLo).lerp(cHi, (baseH[i] - hMin) / (hMax - hMin || 1));
      pCols[i * 3] = cTmp.r;
      pCols[i * 3 + 1] = cTmp.g;
      pCols[i * 3 + 2] = cTmp.b;
    }
    pGeom.setAttribute("color", new THREE.BufferAttribute(pCols, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.95 });
    const points = new THREE.Points(pGeom, pMat);
    points.visible = false;
    scene.add(points);

    /* contour rings (0 m datum) + polar graticule cage */
    const contourGrid = new THREE.PolarGridHelper(4.7, 16, 12, 64, 0x2dd9ec, 0x155e70);
    const cgMat = contourGrid.material as THREE.LineBasicMaterial;
    cgMat.transparent = true;
    cgMat.opacity = 0.32;
    contourGrid.position.y = 0.06;
    contourGrid.visible = false;
    const graticule = new THREE.PolarGridHelper(5.5, 8, 6, 64, 0x51677e, 0x2c3b4c);
    const gMat = graticule.material as THREE.LineBasicMaterial;
    gMat.transparent = true;
    gMat.opacity = 0.28;
    graticule.position.y = 1.4;
    graticule.visible = false;
    scene.add(contourGrid, graticule);

    /* minimal orbit — drag az/el, wheel zoom */
    const cam = { az: 0.66, el: (35 * Math.PI) / 180, dist: 13.4, dragging: false };
    const resetCam = () => {
      cam.az = 0.66;
      cam.el = (35 * Math.PI) / 180;
      cam.dist = 13.4;
    };
    const cvs = renderer.domElement;
    let px = 0;
    let py = 0;
    const onDown = (e: PointerEvent) => {
      cam.dragging = true;
      px = e.clientX;
      py = e.clientY;
      cvs.setPointerCapture(e.pointerId);
      cvs.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!cam.dragging) return;
      cam.az -= (e.clientX - px) * 0.0052;
      cam.el = clampN(cam.el + (e.clientY - py) * 0.0042, 0.14, 1.45);
      px = e.clientX;
      py = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      cam.dragging = false;
      try {
        cvs.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      cvs.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.dist = clampN(cam.dist * Math.exp(e.deltaY * 0.0011), 7.5, 27);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetCam();
    };
    cvs.addEventListener("pointerdown", onDown);
    cvs.addEventListener("pointermove", onMove);
    cvs.addEventListener("pointerup", onUp);
    cvs.addEventListener("pointercancel", onUp);
    cvs.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("lm:reset-cam", resetCam);
    window.addEventListener("keydown", onKey);

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    /* hypsometric texture drape — graceful vertex-color fallback if missing */
    let tex: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      "/imagery/crater-hypso.png",
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        tex = t;
        shadedMat.map = t;
        shadedMat.vertexColors = false;
        shadedMat.needsUpdate = true;
      },
      undefined,
      () => {
        /* imagery not deployed — hypsometric vertex ramp already active */
      },
    );

    sceneRef.current = { mesh, wire, points, contourGrid, graticule, shadedMat, baseH, geom, pGeom };

    let prevMs = performance.now();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const nowMs = performance.now();
      const dt = Math.min(0.06, (nowMs - prevMs) / 1000);
      prevMs = nowMs;
      if (!reduced && !cam.dragging) cam.az += dt * 0.055;
      camera.position.set(
        cam.dist * Math.cos(cam.el) * Math.sin(cam.az),
        cam.dist * Math.sin(cam.el),
        cam.dist * Math.cos(cam.el) * Math.cos(cam.az),
      );
      camera.lookAt(0, -0.5, 0);
      renderer.render(scene, camera);
      if (camRef.current) {
        const azd = (((cam.az * 180) / Math.PI) % 360 + 360) % 360;
        camRef.current.textContent = `CAM: ORBIT · AZ ${azd.toFixed(0).padStart(3, "0")}° · EL ${((cam.el * 180) / Math.PI).toFixed(1)}° · R ${cam.dist.toFixed(1)}`;
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cvs.removeEventListener("pointerdown", onDown);
      cvs.removeEventListener("pointermove", onMove);
      cvs.removeEventListener("pointerup", onUp);
      cvs.removeEventListener("pointercancel", onUp);
      cvs.removeEventListener("wheel", onWheel);
      window.removeEventListener("lm:reset-cam", resetCam);
      window.removeEventListener("keydown", onKey);
      tex?.dispose();
      geom.dispose();
      pGeom.dispose();
      shadedMat.dispose();
      wireMat.dispose();
      pMat.dispose();
      (contourGrid.material as THREE.Material).dispose();
      contourGrid.geometry.dispose();
      (graticule.material as THREE.Material).dispose();
      graticule.geometry.dispose();
      renderer.dispose();
      if (cvs.parentElement === host) host.removeChild(cvs);
      sceneRef.current = null;
    };
  }, []);

  /* ── reactive scene wiring ────────────────────────────────── */
  React.useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.mesh.visible = mode === "relief" || mode === "contour";
    s.wire.visible = mode === "wire";
    s.points.visible = mode === "points";
    s.contourGrid.visible = mode === "contour";
  }, [mode]);

  React.useEffect(() => {
    const s = sceneRef.current;
    const ex = ve3 ? 3 : 1;
    if (!s) return;
    for (const g of [s.geom, s.pGeom]) {
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < s.baseH.length; i++) p.setY(i, s.baseH[i] * ex);
      p.needsUpdate = true;
    }
    s.geom.computeVertexNormals();
    s.graticule.position.y = (1.1 / 3) * ex + 0.32;
  }, [ve3]);

  React.useEffect(() => {
    const s = sceneRef.current;
    if (s) s.graticule.visible = grat;
  }, [grat]);

  /* keep WIREFRAME segment in two-way sync with the global store (F1 hotkey) */
  React.useEffect(() => {
    // Intentional synchronization with the global wireframe/F1 state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode((m) => (wireframe ? "wire" : m === "wire" ? "relief" : m));
  }, [wireframe]);

  const changeMode = React.useCallback(
    (m: ViewMode) => {
      setMode(m);
      if ((m === "wire") !== useMission.getState().wireframe) toggleWireframe();
    },
    [toggleWireframe],
  );

  /* ── synthesis / export run ───────────────────────────────── */
  const running = exportPct !== null && exportPct < 100;

  React.useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setExportPct((p) => (p === null ? p : Math.min(100, p + 2.4 + Math.random() * 4.2)));
    }, 100);
    return () => clearInterval(iv);
  }, [running]);

  React.useEffect(() => {
    if (exportPct === null || exportPct < 100 || exportDone) return;

    // Intentional transition into the completed export state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExportDone(true);

    toast({
      title: "DEM EXPORT COMPLETE",
      description: "shackleton_quad01_dem.tif · 32-BIT FLOAT · GEOGRID VERIFIED",
    });

    const t = setTimeout(() => {
      setExportPct(null);
      setExportDone(false);
    }, 2400);

    return () => clearTimeout(t);
  }, [exportPct, exportDone, toast]);

  const runSynth = () => {
    if (running) return;
    setExportDone(false);
    setExportPct(0.001);
    toast({
      title: "3D DEM SYNTHESIS INITIATED",
      description: "shackleton_quad01 · TMC-2 ⇌ LOLA FUSION · 128×128 GRID",
    });
  };

  const onScatter = (v: boolean) => {
    setScatter(v);
    if (v) {
      toast({
        title: "ATMOSPHERIC SCATTER UNAVAILABLE",
        description: "AIRLESS BODY — RAYLEIGH TERM 0.00 · VACUUM OPTICS APPLIED",
      });
    }
  };

  /* ── render ───────────────────────────────────────────────── */
  const segOptions: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: "relief", label: "SHADED RELIEF", icon: <Mountain className="size-3" aria-hidden="true" /> },
    { id: "wire", label: "WIREFRAME", icon: <Box className="size-3" aria-hidden="true" /> },
    { id: "points", label: "POINT CLOUD", icon: <Grip className="size-3" aria-hidden="true" /> },
    { id: "contour", label: "CONTOUR OVERLAY", icon: <ScanLine className="size-3" aria-hidden="true" /> },
  ];

  return (
    <div className="grid grid-cols-1 min-w-0 xl:grid-cols-12 gap-2">
      {/* ══ CENTER STAGE ═══════════════════════════════════════ */}
      <div className="min-w-0 space-y-2 xl:col-span-8">
        {/* viewport toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Seg options={segOptions} value={mode} onChange={changeMode} />
          <div className="flex items-center gap-1.5">
            <Chip tone="cy">OPENGL 4.6</Chip>
            <Chip tone="gr" dot>
              {live.fps.toFixed(0)} FPS LOCK
            </Chip>
            <button
              type="button"
              onClick={captureFrame}
              title="Capture viewport frame — PNG plate with mission burn-in"
              aria-label="Capture viewport frame as PNG"
              className="flex min-h-[26px] items-center gap-1.5 border border-line bg-[#0a0f16] px-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-dim transition-colors hover:border-am/60 hover:text-am"
            >
              <Camera className="size-3" aria-hidden="true" />
              CAPTURE
            </button>
          </div>
        </div>

        {/* 3D stage */}
        <Panel
          title="3D TERRAIN SYNTHESIS STAGE — SHACKLETON QUAD-01"
          corners
          bodyClass="p-1.5"
          right={<Lbl className="hidden md:inline">DRAG ORBIT · WHEEL ZOOM · ESC RESET</Lbl>}
        >
          <div
            className="hud-viewport h-[340px] sm:h-[420px]"
            role="img"
            aria-label="Interactive 3D mesh of Shackleton crater — drag to orbit, mouse wheel to zoom, Escape to reset camera"
          >
            <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />
            <div className="viewport-grid" />
            <div className="viewport-scanline" />
            <div className="viewport-vignette" />
            <div className="viewport-crt" />
            {/* capture flash — shutter blink */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 z-20 bg-white transition-opacity duration-300 ${flash ? "opacity-25" : "opacity-0"}`}
            />

            <div className="absolute left-2 top-2 z-10 pointer-events-none">
              <Chip tone="dim" className="backdrop-blur-sm">
                MESH {DEM.mesh.res} · {DEM.mesh.cells} CELLS
              </Chip>
            </div>
            <div className="absolute right-2 top-2 z-10 pointer-events-none">
              <svg viewBox="0 0 24 24" className="size-6 animate-spin-slow text-cy/80" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" opacity="0.85" />
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
                <circle cx="12" cy="3" r="1.4" fill="currentColor" />
              </svg>
            </div>
            <span
              ref={camRef}
              className="absolute left-2 bottom-2 z-10 pointer-events-none text-[9px] font-bold uppercase tracking-[0.12em] text-gr/90 mono-tabular"
            >
              CAM: ORBIT · AZ 038° · EL 35.0°
            </span>
            <span className="absolute right-2 bottom-2 z-10 pointer-events-none text-[9px] font-bold uppercase tracking-[0.12em] text-dim/80">
              SRC: {DEM.mesh.source} WARP
            </span>
          </div>
        </Panel>

        {/* synthesis pipeline */}
        <Panel
          title="SYNTHESIS PIPELINE"
          right={<Chip tone="dim">{DEM.stages.filter((s) => s.pct >= 100).length}/4 COMPLETE</Chip>}
        >
          <div className="space-y-1.5">
            {DEM.stages.map((s) => {
              const status =
                s.pct >= 100
                  ? { tone: "gr" as const, label: "COMPLETE" }
                  : s.pct >= 50
                    ? { tone: "cy" as const, label: "ACTIVE" }
                    : { tone: "dim" as const, label: "PENDING" };
              const active = s.pct >= 50 && s.pct < 100;
              return (
                <div
                  key={s.id}
                  className="relative overflow-hidden rounded-[2px] border border-line bg-[#0a0f16] px-2.5 py-2"
                >
                  {active && (
                    <div
                      className="absolute inset-y-0 left-0 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-cy/10 to-transparent"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="w-6 shrink-0 text-[10px] font-extrabold text-cy">{s.id}</span>
                    <div className="min-w-0 flex-1 basis-32">
                      <div className="truncate text-[10.5px] font-bold text-ink">{s.name}</div>
                      <div className="truncate text-[8.5px] uppercase tracking-[0.1em] text-faint">{s.note}</div>
                    </div>
                    <Bar pct={s.pct} tone={s.pct >= 100 ? "cy" : "am"} segments={8} className="w-16 shrink-0 sm:w-28" />
                    <span className="w-9 shrink-0 text-right text-[10px] font-bold mono-tabular text-dim">
                      {s.pct}%
                    </span>
                    <Chip tone={status.tone} dot={status.tone !== "dim"} className="hidden sm:inline-flex">
                      {status.label}
                    </Chip>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* mesh mini-stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MESH_STATS.map((m) => (
            <div key={m.label} className="hud-inset px-2.5 py-2">
              <Stat label={m.label} value={m.value} sub={m.sub} tone={m.tone} size="md" />
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT RAIL ═════════════════════════════════════════ */}
      <div className="min-w-0 space-y-2 xl:col-span-4">
        {/* mesh confidence */}
        <Panel title="MESH CONFIDENCE" accent="gr" right={<Chip tone="gr">99.4%</Chip>}>
          <div className="flex items-center gap-3">
            <Gauge
              value={99.4}
              tone="gr"
              size={88}
              center={<span className="text-[13px] font-extrabold text-gr text-glow-gr mono-tabular">99.4%</span>}
              label="BUNDLE CONFIDENCE"
              sub="LOLA ⇌ TMC-2"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <KV k="RESIDUAL" v="0.082 px" vClass="text-gr" />
              <KV k="VOID CELLS" v="37%" vClass="text-am" />
              <KV k="TIE DENSITY" v="412 /km²" />
              <div className="pt-0.5">
                <Chip tone="gr">PSR PRIOR · SHADOWCAM</Chip>
              </div>
            </div>
          </div>
        </Panel>

        {/* elevation histogram */}
        <Panel title="ELEVATION HISTOGRAM (M)" accent="cy" right={<Lbl>+1,120 ↘ −4,280</Lbl>}>
          <Histogram bins={ELEV_BINS} toneFor={elevTone} labels={["+1,120m RIM", "−4,280m FLOOR"]} height={70} />
          <div className="mt-2 grid grid-cols-2 gap-x-3">
            <KV k="MEAN ELEV" v="−1,846 m" />
            <KV k="STD DEV" v="1,942 m" />
          </div>
        </Panel>

        {/* export geodata */}
        <Panel title="EXPORT GEODATA" right={<Chip tone="am">GDX 2.4</Chip>}>
          <div className="grid grid-cols-2 gap-2">
            {EXPORTS.map((x) => (
              <Btn
                key={x.label}
                icon={<x.icon className="size-3.5" aria-hidden="true" />}
                onClick={() =>
                  toast({
                    title: `EXPORT QUEUED: ${x.label}`,
                    description: `${x.file} · DSN GOLDSTONE 34M UPLINK`,
                  })
                }
              >
                {x.label}
              </Btn>
            ))}
          </div>
          <div className="mt-2">
            <Btn
              variant="accent"
              full
              disabled={running}
              icon={<Mountain className="size-3.5" aria-hidden="true" />}
              onClick={runSynth}
            >
              EXECUTE 3D DEM SYNTHESIS &amp; EXPORT GEOTIFF
            </Btn>
            {exportPct !== null && (
              <div className="mt-2" role="status" aria-live="polite">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Lbl className={exportDone ? "text-gr" : undefined}>
                    {exportDone ? "COMPLETE — .TIF WRITTEN" : "SYNTHESIZING HEIGHTFIELD"}
                  </Lbl>
                  <span
                    className={`text-[10px] font-extrabold mono-tabular ${exportDone ? "text-gr" : "text-cy"}`}
                  >
                    {Math.round(exportPct)}%
                  </span>
                </div>
                <Bar pct={exportPct} tone={exportDone ? "gr" : "cy-gr"} segments={10} />
              </div>
            )}
          </div>
        </Panel>

        {/* render parameters */}
        <Panel title="RENDER PARAMETERS" right={<Chip tone="dim">GL SL 4.60</Chip>}>
          <div className="space-y-2.5">
            <Tick label="VERTICAL EXAGGERATION ×3" checked={ve3} onChange={setVe3} tone="cy" />
            <Tick label="GRATICULE OVERLAY" checked={grat} onChange={setGrat} tone="gr" />
            <Tick label="ATMOSPHERIC SCATTER" checked={scatter} onChange={onScatter} tone="am" />
            <div className="divider-h" />
            <div className="grid grid-cols-2 gap-x-3">
              <KV k="EXAG FACTOR" v={ve3 ? "×3.0" : "×1.0"} vClass="text-cy" />
              <KV k="GRATICULE" v={grat ? "POLAR 8×6" : "OFF"} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}