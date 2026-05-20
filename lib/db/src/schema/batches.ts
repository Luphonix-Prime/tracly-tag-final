import { sqliteTable, integer, text, unique } from "drizzle-orm/sqlite-core";
import { productsTable } from "./products";

export const batchesTable = sqliteTable("batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  batchNumber: text("batch_number").notNull(),
  mfgDate: text("mfg_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => [unique().on(t.productId, t.batchNumber)]);

export type Batch = typeof batchesTable.$inferSelect;
export type InsertBatch = typeof batchesTable.$inferInsert;
