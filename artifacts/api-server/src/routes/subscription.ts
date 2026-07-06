import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";

const router = Router();

/**
 * POST /subscription/set
 * Master-only endpoint to manually assign a subscription plan to a company.
 * Body: { companyId: number, plan: "free" | "standard" | "enterprise", durationDays?: number }
 */
router.post("/subscription/set", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (req.user.role !== "master" && req.user.role !== "super_master") {
    res.status(403).json({ error: "Only the master account can manage subscriptions" });
    return;
  }

  const { companyId, plan, durationDays } = req.body;

  if (!companyId) {
    res.status(400).json({ error: "companyId is required" });
    return;
  }

  if (plan !== "free" && plan !== "standard" && plan !== "enterprise") {
    res.status(400).json({ error: "Invalid plan. Must be 'free', 'standard', or 'enterprise'" });
    return;
  }

  const days = typeof durationDays === "number" && durationDays > 0 ? durationDays : 30;

  try {
    const expiresAtDate = new Date();
    expiresAtDate.setDate(expiresAtDate.getDate() + days);

    await db
      .update(companiesTable)
      .set({
        subscriptionPlan: plan,
        subscriptionStatus: plan === "free" ? "inactive" : "active",
        subscriptionExpiresAt: plan === "free" ? null : expiresAtDate.toISOString(),
      })
      .where(eq(companiesTable.id, parseInt(companyId, 10)));

    res.json({
      success: true,
      companyId: parseInt(companyId, 10),
      plan,
      subscriptionStatus: plan === "free" ? "inactive" : "active",
      expiresAt: plan === "free" ? null : expiresAtDate.toISOString(),
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to update company subscription");
    res.status(500).json({ error: "Failed to update subscription in database" });
  }
});

export default router;
