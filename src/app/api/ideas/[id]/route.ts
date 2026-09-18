import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ideas } from "@/db/schema";
import { translateIdea } from "@/lib/translate";

// PATCH /api/ideas/:id -> owner edits their own idea, only while still pending
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { title, description, deviceId, locale } = body ?? {};

  if (typeof deviceId !== "string" || deviceId.trim().length === 0) {
    return NextResponse.json({ error: "Missing device id" }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const trimmedTitle = title.trim().slice(0, 200);
  const trimmedDescription = typeof description === "string" ? description.trim().slice(0, 2000) : null;
  const sourceLocale = typeof locale === "string" ? locale : null;

  const translations =
    sourceLocale && (await translateIdea({ title: trimmedTitle, description: trimmedDescription }, sourceLocale));

  const db = getDb();
  const result = await db
    .update(ideas)
    .set({
      title: trimmedTitle,
      description: trimmedDescription,
      sourceLocale,
      translations: translations || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ideas.id, id),
        eq(ideas.submitterDeviceId, deviceId),
        eq(ideas.status, "pending"),
      ),
    )
    .returning({ id: ideas.id });

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Idea not found, not yours, or no longer editable" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/ideas/:id?deviceId=... -> owner deletes their own idea, only while still pending
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  if (!deviceId) {
    return NextResponse.json({ error: "Missing device id" }, { status: 400 });
  }

  const db = getDb();
  const result = await db
    .delete(ideas)
    .where(
      and(
        eq(ideas.id, id),
        eq(ideas.submitterDeviceId, deviceId),
        eq(ideas.status, "pending"),
      ),
    )
    .returning({ id: ideas.id });

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Idea not found, not yours, or no longer deletable" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
