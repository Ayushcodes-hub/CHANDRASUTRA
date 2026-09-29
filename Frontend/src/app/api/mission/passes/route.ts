import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * PASS REVIEW FLAGS — PATCH /api/mission/passes
 * Body: { passId: string; flagged?: boolean; status?: "LOCKED" | "REVIEW" | "FLAGGED" }
 * Persists operator review actions from the telemetry archive register.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { passId?: string; flagged?: boolean; status?: string };
    if (!body?.passId) {
      return NextResponse.json({ error: "passId-required" }, { status: 400 });
    }

    const updated = await db.orbitPass.update({
      where: { passId: body.passId },
      data: {
        ...(typeof body.flagged === "boolean" ? { flagged: body.flagged } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });

    return NextResponse.json({ pass: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: "flag-update-failed", detail: String(e) }, { status: 500 });
  }
}

/**
 * ORBIT PASS ARCHIVE — GET /api/mission/passes?site=&flagged=
 * Serves the telemetry archive table + inspector.
 */
export async function GET(req: NextRequest) {
  try {
    const site = req.nextUrl.searchParams.get("site");
    const flagged = req.nextUrl.searchParams.get("flagged");

    const passes = await db.orbitPass.findMany({
      where: {
        ...(site ? { siteName: { contains: site } } : {}),
        ...(flagged === "1" ? { flagged: true } : {}),
      },
      orderBy: { passId: "desc" },
      take: 100,
    });

    const incidents = await db.incident.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

    return NextResponse.json(
      {
        passes,
        incidents,
        stats: { total: 1482, passes: passes.length },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json({ error: "archive-unavailable", detail: String(e) }, { status: 500 });
  }
}
