import { Router, type IRouter } from "express";
import { db, paymentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/payments/orders", async (req, res): Promise<void> => {
  const { amount, currency, purpose, clinicId, subscriptionPlan } = req.body;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // Return a mock order for development without Razorpay keys
    const mockOrderId = `order_mock_${Date.now()}`;
    res.status(201).json({ orderId: mockOrderId, amount, currency: currency || "INR", keyId: keyId || "rzp_test_mock" });
    return;
  }

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency: currency || "INR", receipt: `receipt_${Date.now()}` }),
    });
    const order = await response.json() as { id: string };
    res.status(201).json({ orderId: order.id, amount, currency: currency || "INR", keyId });
  } catch (err) {
    logger.error({ err }, "Razorpay order creation failed");
    res.status(500).json({ error: "Payment order creation failed" });
  }
});

router.post("/payments/verify", async (req, res): Promise<void> => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, purpose, clinicId, subscriptionPlan, userId } = req.body;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  let isValid = true;
  if (keySecret && !razorpayOrderId.startsWith("order_mock_")) {
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSig = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
    isValid = expectedSig === razorpaySignature;
  }

  if (!isValid) {
    res.status(400).json({ error: "Payment verification failed" });
    return;
  }

  const [payment] = await db.insert(paymentsTable).values({
    userId: userId || null, clinicId: clinicId || null,
    amount: String(req.body.amount || 0), currency: "INR",
    status: "completed", razorpayOrderId, razorpayPaymentId,
    razorpaySignature, purpose, subscriptionPlan: subscriptionPlan || null,
  }).returning();

  res.json(payment);
});

router.get("/payments", async (req, res): Promise<void> => {
  const { clinicId, userId } = req.query as Record<string, string>;
  const conditions = [];
  if (clinicId) conditions.push(eq(paymentsTable.clinicId, parseInt(clinicId)));
  if (userId) conditions.push(eq(paymentsTable.userId, parseInt(userId)));
  const payments = conditions.length > 0
    ? await db.select().from(paymentsTable).where(and(...conditions))
    : await db.select().from(paymentsTable);
  res.json(payments);
});

export default router;
