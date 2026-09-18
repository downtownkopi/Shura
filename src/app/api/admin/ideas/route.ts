import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ideas } from "@/db/schema";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";

// GET /api/admin/ideas -> all ideas (pending/approved/rejected), for the committee inbox
export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db.select().from(ideas).orderBy(desc(ideas.createdAt));

  return NextResponse.json(rows);
}
