import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { ideas, votes } from "@/db/schema";
import { pickLocalizedText } from "@/lib/translate";

// GET /api/ideas/history?locale=... -> approved ideas whose voting deadline has passed, with final counts
export async function GET(request: NextRequest) {
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
      votingDeadline: ideas.votingDeadline,
      voteCount: sql<number>`coalesce(sum(${votes.value}), 0)`.mapWith(Number),
    })
    .from(ideas)
    .leftJoin(votes, eq(votes.ideaId, ideas.id))
    .where(and(eq(ideas.status, "approved"), lte(ideas.votingDeadline, new Date())))
    .groupBy(ideas.id)
    .orderBy(desc(ideas.votingDeadline));

  return NextResponse.json(
    rows.map((r) => {
      const localized = pickLocalizedText(r, locale);
      return {
        id: r.id,
        title: localized.title,
        description: localized.description,
        photoUrl: r.photoUrl,
        votingDeadline: r.votingDeadline,
        voteCount: r.voteCount,
      };
    }),
  );
}
