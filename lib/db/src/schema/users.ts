import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { companiesTable } from "./companies";

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  enabledModules: text("enabled_modules").notNull().default("dashboard,companies,users,products,locations,batches,generate_codes,mapping_code,customer_scan,summary,reports"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
