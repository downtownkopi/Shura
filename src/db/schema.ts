import { integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const ideas = pgTable("ideas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  submitterDeviceId: text("submitter_device_id").notNull(),
  submitterName: text("submitter_name"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  committeeComment: text("committee_comment"),
  photoUrl: text("photo_url"),
  votingDeadline: timestamp("voting_deadline", { withTimezone: true }),
  sourceLocale: text("source_locale"),
  translations: jsonb("translations").$type<Record<string, { title: string; description: string | null }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    ideaId: text("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    value: integer("value").notNull().default(1), // 1 = upvote, -1 = downvote
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("idea_device_unique").on(table.ideaId, table.deviceId)],
);
