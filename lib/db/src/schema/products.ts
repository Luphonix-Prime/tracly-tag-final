import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { companiesTable } from "./companies";

export const productsTable = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  skuId: text("sku_id").notNull(),
  name: text("name").notNull(),
  skuSize: text("sku_size").notNull(),
  marketedBy: text("marketed_by").notNull(),
  sapDescription: text("sap_description"),
  gtin: text("gtin").notNull(),
  mrp: real("mrp").notNull(),
  registrationNo: text("registration_no"),
  l1Size: integer("l1_size").notNull(),
  l2Size: integer("l2_size").notNull(),
  shipperSize: integer("shipper_size").notNull(),
  cautionLogoUrl: text("caution_logo_url"),
  productLogoUrl: text("product_logo_url"),
  labelPdfUrl: text("label_pdf_url"),
  expiryDate: text("expiry_date").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
