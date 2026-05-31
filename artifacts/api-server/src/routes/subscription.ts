import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import crypto from "crypto";

const router = Router();

const KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_DUMMY_KEY_ID";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "DUMMY_KEY_SECRET";

router.post("/subscription/create-order", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { plan } = req.body;
  if (plan !== "standard" && plan !== "enterprise") {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  const amount = plan === "standard" ? 199900 : 999900; // in paise

  try {
    if (KEY_ID !== "rzp_test_DUMMY_KEY_ID") {
      const authString = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `receipt_co_${req.user.companyId || 0}_${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        res.json({
          success: true,
          key: KEY_ID,
          orderId: data.id,
          amount: data.amount,
          currency: data.currency,
          isMock: false,
        });
        return;
      } else {
        const errText = await response.text();
        req.log.warn({ err: errText }, "Razorpay API error, falling back to mock mode");
      }
    }
  } catch (e) {
    req.log.warn({ err: e }, "Failed to connect to Razorpay, falling back to mock mode");
  }

  // Fallback / Mock mode
  const mockOrderId = `order_mock_${crypto.randomBytes(8).toString("hex")}`;
  res.json({
    success: true,
    key: "rzp_test_DUMMY_KEY_ID",
    orderId: mockOrderId,
    amount,
    currency: "INR",
    isMock: true,
  });
});

router.post("/subscription/verify-payment", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (!req.user.companyId) {
    res.status(400).json({ error: "User is not associated with any company" });
    return;
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } = req.body;

  if (plan !== "standard" && plan !== "enterprise" && plan !== "free") {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  // If it's a mock order or using dummy keys, skip signature verification
  const isMock = !razorpay_order_id || razorpay_order_id.startsWith("order_mock_") || KEY_ID === "rzp_test_DUMMY_KEY_ID";

  if (!isMock) {
    const generated_signature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      res.status(400).json({ error: "Payment verification failed" });
      return;
    }
  }

  try {
    const expiresAtDate = new Date();
    expiresAtDate.setDate(expiresAtDate.getDate() + 30); // 30 days subscription

    await db
      .update(companiesTable)
      .set({
        subscriptionPlan: plan,
        subscriptionStatus: "active",
        subscriptionExpiresAt: expiresAtDate.toISOString(),
        razorpayOrderId: razorpay_order_id || null,
        razorpayPaymentId: razorpay_payment_id || null,
      })
      .where(eq(companiesTable.id, req.user.companyId));

    res.json({ success: true, plan });
  } catch (err: any) {
    req.log.error({ err }, "Failed to update company subscription");
    res.status(500).json({ error: "Failed to update subscription in database" });
  }
});

export default router;
