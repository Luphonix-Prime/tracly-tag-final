import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const companiesTable = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  gstin: text("gstin"),
  subscriptionPlan: text("subscription_plan").notNull().$defaultFn(() => "free"),
  subscriptionStatus: text("subscription_status").notNull().$defaultFn(() => "active"),
  subscriptionExpiresAt: text("subscription_expires_at"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  companyUrl: text("company_url"),
  apiKey: text("api_key"),
  pan: text("pan"),
  cin: text("cin"),
  msmeRegistrationNo: text("msme_registration_no"),
  fssaiLicenseNo: text("fssai_license_no"),
  drugLicenseNo: text("drug_license_no"),
  iecCode: text("iec_code"),
  companyPrefix: text("company_prefix"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Company = typeof companiesTable.$inferSelect;
export type InsertCompany = typeof companiesTable.$inferInsert;
