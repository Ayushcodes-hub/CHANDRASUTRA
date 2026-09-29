import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * LUNAR-GEOAI V4.1 (VLM INTEL) — streaming terrain analyst
 * GET /api/mission/vlm-intel?module=orbital|photometric|elevation|dem
 * Returns JSON { lines: string[], source: "llm" | "fallback" }
 * The LLM output is grounded with hard telemetry facts (anti-hallucination).
 */

const GROUNDING: Record<string, string> = {
  orbital: `Pass #0482-S, Shackleton rim (89.9°S, 0.0°E). TMC-2 stereo ⇄ OHRC registration. Solar elevation 18.4° (grazing), azimuth 45.2° NE, PSR ratio 62.1%. Convergence 98.9%, inliers 178/180, RMSE 0.13 px, PSNR gain 10.74 dB, SSIM 0.972, residual median 0.082 px, epipolar error 0.019°. Lommel-Seeliger normalization active.`,
  photometric: `Photometric lab, phase angle 71.6°. Minnaert k=0.742, Hapke roughness θ=24.5°, surge width h=0.038, single-scattering albedo ω=0.124, anisotropy b=0.310, forward coefficient c=0.180. Convergence fidelity 99.1% after #1,482 iterations, residual RMSE 0.042 I/F, PSNR gain +12.84 dB, flux restoration 89.2%, tie-point yield +312 in deep PSR bowl.`,
  elevation: `Shackleton crater DEM, grid SHACKLETON-SOUTH-POLAR-QUAD-01, 21,000 samples at 1.0 m step. Diameter 21.0 km, max nadir depth −4,280 m, crest relief +1,120 m. Max slope 31.8° (hazard), cold-trap risk 42.1%, rim-A solar persistence 86.4%, floor 0.0% (eternal PSR). Water-ice estimate 5.6 wt% sub-surface. Fused stack: LOLA 1400 Hz + TMC-2 stereo + ShadowCam/LROC NAC.`,
  dem: `3D DEM synthesis from TMC-2 stereo + LOLA warp. Mesh 128×128 (16,384 cells), 2.1M point cloud at 0.5 m/px. Depth-map fusion complete, Delaunay 2.5D triangulation complete, photometric texture drape at 84%, PSR void interpolation via ShadowCam prior at 37%.`,
};

const FALLBACK: Record<string, string[]> = {
  orbital: [
    "[TERRAIN ANALYSIS]: Solar grazing incidence at 18.4° induces 74% shadow occlusions in crater interior. Lommel-Seeliger photometric correction recovers 91.4% feature contrast along boulder fields.",
    "[HAZARD ADVISORY]: TGT-B connecting ridge transect holds epipolar lock at 0.019°; PSR interior keypoints rejected at 4.22 px residual — masked from MAGSAC consensus.",
  ],
  photometric: [
    "Lommel-Seeliger norm eliminated 89.2% of solar azimuth bias across connecting ridge transect.",
    "Hapke shadow fill boosted feature extraction yield by +312 candidates in deep PSR bowl.",
    "Confidence score for 3D DEM stereoscopic bundle: 99.4%. Ready for photometric export.",
  ],
  elevation: [
    "[GEOTECH]: Wall incline 31.8° exceeds wheeled traverse limit — recommend tethered rappel descent or hopper rover architecture.",
    "[VOLATILES]: PSR floor nadir (−4,280 m) co-registered with Neutron spectrometer enhanced hydrogen signature — 5.6 wt% water-ice equivalent at 0.6 m depth.",
  ],
  dem: [
    "[MESH INTEGRITY]: 16,384 cells triangulated; 62% of PSR voids bridged by ShadowCam prior — residual holes confined to permanently shadowed floor nadir.",
    "[EXPORT READINESS]: Texture drape 84% complete; Geotiff + LAS 1.4 exports will include full DEM confidence raster.",
  ],
};

export async function GET(req: NextRequest) {
  const mod = req.nextUrl.searchParams.get("module") ?? "orbital";
  const grounding = GROUNDING[mod] ?? GROUNDING.orbital;

  try {
    const zai = await ZAI.create();
    const completion = (await Promise.race([
      zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "You are LUNAR-GEOAI V4.1, the onboard VLM terrain-intelligence module of a lunar registration console. Write 2-3 SHORT mission-log lines (max 26 words each). Each line starts with a bracketed tag like [TERRAIN ANALYSIS], [HAZARD ADVISORY], [REGOLITH], [GEOTECH], [MATCH], [EXPORT]. Use precise numbers taken from the telemetry. No markdown, no bullets, plain lines only.",
          },
          {
            role: "user",
            content: `Current telemetry: ${grounding}\nGenerate the intel lines now.`,
          },
        ],
        thinking: { type: "disabled" },
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("llm-timeout")), 20000)),
    ])) as { choices?: { message?: { content?: string } }[] };

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const lines = raw
      .split("\n")
      .map((l) => l.replace(/^[\s>*\-•]+/, "").trim())
      .filter((l) => l.length > 8)
      .slice(0, 3);

    if (lines.length === 0) throw new Error("empty");
    return NextResponse.json({ lines, source: "llm" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ lines: FALLBACK[mod] ?? FALLBACK.orbital, source: "fallback" }, { headers: { "Cache-Control": "no-store" } });
  }
}
