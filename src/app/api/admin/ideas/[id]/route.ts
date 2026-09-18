import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ideas } from "@/db/schema";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";

const ALLOWED_STATUSES = new Set(["approved", "rejected", "pending"]);

// PATCH /api/admin/ideas/:id -> committee approves/rejects an idea.
// Approving requires a votingDeadline (ISO date string) so the idea has a known voting window.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, comment, deadline } = body ?? {};

  if (typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let votingDeadline: Date | null = null;
  if (status === "approved") {
    if (typeof deadline !== "string" || !deadline) {
      return NextResponse.json({ error: "A voting deadline is required to approve" }, { status: 400 });
    }
    // Keep the idea open through the whole chosen day, in the committee's local time zone offset as sent.
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Deadline must be a valid future date" }, { status: 400 });
    }
    votingDeadline = parsed;
  }

  const db = getDb();
  const result = await db
    .update(ideas)
    .set({
      status,
      committeeComment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 1000) : null,
      votingDeadline,
      updatedAt: new Date(),
    })
    .where(eq(ideas.id, id))
    .returning({ id: ideas.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
