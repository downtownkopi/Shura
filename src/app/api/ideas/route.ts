import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db";
import { ideas, votes } from "@/db/schema";
import { pickLocalizedText, translateIdea } from "@/lib/translate";

// Only accept photo URLs that actually point at our Vercel Blob store.
function isTrustedBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

// GET /api/ideas?deviceId=...&locale=... -> approved ideas with vote counts, for the public voting page
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  const db = getDb();

  const rows = await db
    .select({
      id: ideas.id,
      title: ideas.title,
      description: ideas.description,
      sourceLocale: ideas.sourceLocale,
      translations: ideas.translations,
      photoUrl: ideas.photoUrl,
      submitterName: ideas.submitterName,
      createdAt: ideas.createdAt,
      votingDeadline: ideas.votingDeadline,
      voteCount: sql<number>`coalesce(sum(${votes.value}), 0)`.mapWith(Number),
      myVote: sql<number>`coalesce(sum(${votes.value}) filter (where ${votes.deviceId} = ${deviceId}), 0)`.mapWith(
        Number,
      ),
    })
    .from(ideas)
    .leftJoin(votes, eq(votes.ideaId, ideas.id))
    .where(
      and(
        eq(ideas.status, "approved"),
        or(isNull(ideas.votingDeadline), gt(ideas.votingDeadline, new Date())),
      ),
    )
    .groupBy(ideas.id)
    .orderBy(desc(sql`coalesce(sum(${votes.value}), 0)`));

  return NextResponse.json(
    rows.map((r) => {
      const localized = pickLocalizedText(r, locale);
      return {
        id: r.id,
        title: localized.title,
        description: localized.description,
        photoUrl: r.photoUrl,
        submitterName: r.submitterName,
        createdAt: r.createdAt,
        votingDeadline: r.votingDeadline,
        voteCount: r.voteCount,
        myVote: r.myVote,
      };
    }),
  );
}

// POST /api/ideas -> submit a new idea, lands in committee inbox (status: pending)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, submitterName, deviceId, photoUrl, locale } = body ?? {};

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (typeof deviceId !== "string" || deviceId.trim().length === 0) {
    return NextResponse.json({ error: "Missing device id" }, { status: 400 });
  }
  if (photoUrl !== undefined && photoUrl !== null && !isTrustedBlobUrl(photoUrl)) {
    return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
  }

  const trimmedTitle = title.trim().slice(0, 200);
  const trimmedDescription = typeof description === "string" ? description.trim().slice(0, 2000) : null;
  const sourceLocale = typeof locale === "string" ? locale : null;

  const translations =
    sourceLocale && (await translateIdea({ title: trimmedTitle, description: trimmedDescription }, sourceLocale));

  const db = getDb();
  const id = nanoid();

  await db.insert(ideas).values({
    id,
    title: trimmedTitle,
    description: trimmedDescription,
    submitterName: typeof submitterName === "string" && submitterName.trim() ? submitterName.trim().slice(0, 100) : null,
    submitterDeviceId: deviceId,
    photoUrl: typeof photoUrl === "string" ? photoUrl : null,
    sourceLocale,
    translations: translations || null,
    status: "pending",
  });

  return NextResponse.json({ id }, { status: 201 });
}
