import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ideas } from "@/db/schema";

// GET /api/ideas/mine?deviceId=... -> ideas submitted from this device
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "Missing device id" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(ideas)
    .where(eq(ideas.submitterDeviceId, deviceId))
    .orderBy(desc(ideas.createdAt));

  return NextResponse.json(rows);
}
