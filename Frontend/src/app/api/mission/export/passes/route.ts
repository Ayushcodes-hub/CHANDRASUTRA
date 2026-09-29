import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * ARCHIVE CSV EXPORT — GET /api/mission/export/passes
 */
export async function GET() {
  const passes = await db.orbitPass.findMany({ orderBy: { passId: "desc" } });
  const header = "pass_id,epoch_utc,site,lat,lon,sensor_a,sensor_b,inlier_ratio,inliers_matched,inliers_total,rmse_px,psnr_db,ssim,status";
  const rows = passes.map((p) =>
    [p.passId, p.epoch, p.siteName, p.lat, p.lon, p.sensorA, p.sensorB, p.inlierRatio, p.inliersMatched, p.inliersTotal, p.rmse, p.psnr, p.ssim, p.status].join(",")
  );
  const csv = [`# LUNARMATCH 2.0 orbit pass archive — exported ${new Date().toISOString()}`, header, ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="lunarmatch_orbit_passes.csv"',
    },
  });
}
