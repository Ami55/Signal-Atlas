import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const captures = sqliteTable("captures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").notNull(),
  query: text("query").notNull(),
  queryNorm: text("query_norm").notNull(),
  googleUrl: text("google_url").notNull(),
  aiText: text("ai_text").notNull(),
  tblMention: text("tbl_mention").notNull().default(""),
  tblMentioned: integer("tbl_mentioned").notNull().default(0),
  contributor: text("contributor").notNull(),
  location: text("location").notNull(),
  notes: text("notes").notNull().default(""),
  mentionedSites: text("mentioned_sites").notNull().default(""),
  citedSources: text("cited_sources").notNull().default(""),
  screenshotKey: text("screenshot_key"),
}, (table) => [index("idx_captures_created_at").on(table.createdAt), uniqueIndex("idx_captures_query_norm_unique").on(table.queryNorm)]);
