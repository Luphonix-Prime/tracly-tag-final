import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const companiesTable = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  gstin: text("gstin"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Company = typeof companiesTable.$inferSelect;
export type InsertCompany = typeof companiesTable.$inferInsert;
