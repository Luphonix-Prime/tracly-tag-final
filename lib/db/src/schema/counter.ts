import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { codesTable } from "./codes";

export const counterTable = sqliteTable("counter", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codeId: integer("code_id").notNull().references(() => codesTable.id, { onDelete: "cascade" }),
  rawLink: text("raw_link").notNull(),
  scanCount: integer("scan_count").notNull().default(1),
  firstScannedAt: text("first_scanned_at").notNull().$defaultFn(() => new Date().toISOString()),
  lastScannedAt: text("last_scanned_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Counter = typeof counterTable.$inferSelect;
export type InsertCounter = typeof counterTable.$inferInsert;
