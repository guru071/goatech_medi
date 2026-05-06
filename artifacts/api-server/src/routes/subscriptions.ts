import { Router, type IRouter } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const PLANS = [
  {
    id: "basic", name: "Basic", price: 499, billingCycle: "monthly",
    features: ["Up to 5 Doctors", "100 Appointments/Month", "Basic Analytics", "Email Support"],
    maxDoctors: 5, maxAppointmentsPerMonth: 100,
    isFeatured: false, hasAnalytics: false, hasWhatsappIntegration: false,
  },
  {
    id: "premium", name: "Premium", price: 1499, billingCycle: "monthly",
    features: ["Unlimited Doctors", "Unlimited Appointments", "Advanced Analytics", "WhatsApp Integration", "Featured Listing", "Priority Support"],
    maxDoctors: null, maxAppointmentsPerMonth: null,
    isFeatured: true, hasAnalytics: true, hasWhatsappIntegration: true,
  },
  {
    id: "enterprise", name: "Enterprise", price: 0, billingCycle: "custom",
    features: ["Everything in Premium", "Custom Integrations", "Dedicated Account Manager", "SLA Guarantee", "Instagram Promotion", "API Access"],
    maxDoctors: null, maxAppointmentsPerMonth: null,
    isFeatured: true, hasAnalytics: true, hasWhatsappIntegration: true,
  },
];

router.get("/subscriptions/plans", async (_req, res): Promise<void> => {
  res.json(PLANS);
});

router.get("/subscriptions", async (req, res): Promise<void> => {
  const { clinicId, userId, status } = req.query as Record<string, string>;
  const conditions = [];
  if (clinicId) conditions.push(eq(subscriptionsTable.clinicId, parseInt(clinicId)));
  if (userId) conditions.push(eq(subscriptionsTable.userId, parseInt(userId)));
  if (status) conditions.push(eq(subscriptionsTable.status, status));
  const subs = conditions.length > 0
    ? await db.select().from(subscriptionsTable).where(and(...conditions))
    : await db.select().from(subscriptionsTable);
  res.json(subs);
});

router.post("/subscriptions", async (req, res): Promise<void> => {
  const { clinicId, userId, plan, paymentId } = req.body;
  const startDate = new Date().toISOString().split("T")[0];
  const endD = new Date(); endD.setMonth(endD.getMonth() + 1);
  const endDate = endD.toISOString().split("T")[0];
  const [sub] = await db.insert(subscriptionsTable).values({
    clinicId: clinicId || null, userId: userId || null,
    plan, status: "active", startDate, endDate,
    razorpaySubscriptionId: paymentId || null,
  }).returning();
  res.status(201).json(sub);
});

export default router;
