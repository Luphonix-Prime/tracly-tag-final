import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { productsTable } from "./products";
import { batchesTable } from "./batches";
import { locationsTable } from "./locations";
import { usersTable } from "./users";

export const codesTable = sqliteTable("codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  batchId: integer("batch_id").references(() => batchesTable.id, { onDelete: "cascade" }),
  level: text("level").notNull(),
  rawString: text("raw_string").notNull().unique(),
  serialNumber: text("serial_number"),
  ssccCode: text("sscc_code"),
  mapped: integer("mapped", { mode: "boolean" }).notNull().default(false),
  mappedAt: text("mapped_at"),
  mappedByUserId: integer("mapped_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  locationId: integer("location_id").references(() => locationsTable.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Code = typeof codesTable.$inferSelect;
export type InsertCode = typeof codesTable.$inferInsert;
