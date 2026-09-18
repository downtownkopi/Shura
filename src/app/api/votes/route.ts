import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db";
import { ideas, votes } from "@/db/schema";

// POST /api/votes -> idempotently set this device's vote on an approved idea to an exact state.
// value: 1 = upvote, -1 = downvote, 0 = no vote. Safe to call repeatedly with the same value
// (used by the client's debounced voting UI, which only sends the final state after rapid clicks).
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ideaId, deviceId, value } = body ?? {};

  if (typeof ideaId !== "string" || typeof deviceId !== "string" || !deviceId.trim()) {
    return NextResponse.json({ error: "Missing ideaId or deviceId" }, { status: 400 });
  }
  if (value !== 1 && value !== -1 && value !== 0) {
    return NextResponse.json({ error: "value must be 1, -1, or 0" }, { status: 400 });
  }

  const db = getDb();

  if (value === 0) {
    await db.delete(votes).where(and(eq(votes.ideaId, ideaId), eq(votes.deviceId, deviceId)));
    return NextResponse.json({ myVote: 0 });
  }

  const [idea] = await db
    .select({ id: ideas.id, status: ideas.status })
    .from(ideas)
    .where(eq(ideas.id, ideaId))
    .limit(1);

  if (!idea || idea.status !== "approved") {
    return NextResponse.json({ error: "Idea is not open for voting" }, { status: 404 });
  }

  await db
    .insert(votes)
    .values({ id: nanoid(), ideaId, deviceId, value })
    .onConflictDoUpdate({
      target: [votes.ideaId, votes.deviceId],
      set: { value },
    });

  return NextResponse.json({ myVote: value }, { status: 201 });
}
