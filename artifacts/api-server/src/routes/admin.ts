import { Router, type IRouter } from "express";
import { db, clinicsTable, usersTable, doctorsTable, appointmentsTable, paymentsTable, subscriptionsTable, complaintsTable, reviewsTable } from "@workspace/db";
import { eq, and, count, sum, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/dashboard", async (_req, res): Promise<void> => {
  const [clinicsCount] = await db.select({ count: count() }).from(clinicsTable);
  const [pendingCount] = await db.select({ count: count() }).from(clinicsTable).where(eq(clinicsTable.status, "pending"));
  const [approvedCount] = await db.select({ count: count() }).from(clinicsTable).where(eq(clinicsTable.status, "approved"));
  const [doctorsCount] = await db.select({ count: count() }).from(doctorsTable);
  const [patientsCount] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "patient"));
  const [apptsCount] = await db.select({ count: count() }).from(appointmentsTable);
  const today = new Date().toISOString().split("T")[0];
  const [todayCount] = await db.select({ count: count() }).from(appointmentsTable).where(eq(appointmentsTable.appointmentDate, today));
  const completedPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "completed"));
  const totalRevenue = completedPayments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = completedPayments.filter(p => p.createdAt.toISOString().startsWith(thisMonth)).reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);
  const [activeSubs] = await db.select({ count: count() }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "active"));
  const [openComplaints] = await db.select({ count: count() }).from(complaintsTable).where(eq(complaintsTable.status, "open"));
  const recentClinics = await db.select().from(clinicsTable).orderBy(desc(clinicsTable.createdAt)).limit(5);

  const planStats = ["basic", "premium", "enterprise"];
  const revenueByPlan = await Promise.all(planStats.map(async plan => {
    const subs = await db.select({ count: count() }).from(subscriptionsTable).where(and(eq(subscriptionsTable.plan, plan), eq(subscriptionsTable.status, "active")));
    const planPayments = completedPayments.filter(p => p.subscriptionPlan === plan);
    return { plan, count: Number(subs[0]?.count ?? 0), revenue: planPayments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0) };
  }));

  res.json({
    totalClinics: Number(clinicsCount.count), pendingClinics: Number(pendingCount.count),
    approvedClinics: Number(approvedCount.count), totalDoctors: Number(doctorsCount.count),
    totalPatients: Number(patientsCount.count), totalAppointments: Number(apptsCount.count),
    todayAppointments: Number(todayCount.count), totalRevenue, monthlyRevenue,
    activeSubscriptions: Number(activeSubs.count), openComplaints: Number(openComplaints.count),
    recentClinics, revenueByPlan,
  });
});

router.get("/admin/clinics", async (req, res): Promise<void> => {
  const { status, category } = req.query as Record<string, string>;
  const conditions = [];
  if (status) conditions.push(eq(clinicsTable.status, status));
  const clinics = conditions.length > 0
    ? await db.select().from(clinicsTable).where(and(...conditions)).orderBy(desc(clinicsTable.createdAt))
    : await db.select().from(clinicsTable).orderBy(desc(clinicsTable.createdAt));
  res.json(clinics);
});

router.get("/admin/users", async (_req, res): Promise<void> => {
  const users = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    phone: usersTable.phone, role: usersTable.role, avatarUrl: usersTable.avatarUrl,
    firebaseUid: usersTable.firebaseUid, isVerified: usersTable.isVerified,
    createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt,
  }).from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users);
});

router.get("/admin/revenue", async (req, res): Promise<void> => {
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "completed"));
  const totalRevenue = payments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const m = d.toISOString().slice(0, 7);
    const monthP = payments.filter(p => p.createdAt.toISOString().startsWith(m));
    monthlyData.push({ month: d.toLocaleString("default", { month: "short" }), revenue: monthP.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0), appointments: monthP.length });
  }
  const planNames = ["basic", "premium", "enterprise"];
  const byPlan = planNames.map(plan => ({
    plan, count: payments.filter(p => p.subscriptionPlan === plan).length,
    revenue: payments.filter(p => p.subscriptionPlan === plan).reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0),
  }));
  res.json({ totalRevenue, monthlyData, byPlan, byCategory: [] });
});

router.get("/admin/complaints", async (_req, res): Promise<void> => {
  const complaints = await db.select().from(complaintsTable).orderBy(desc(complaintsTable.createdAt));
  res.json(complaints);
});

router.post("/admin/complaints", async (req, res): Promise<void> => {
  const { userId, clinicId, subject, description, priority } = req.body;
  const [c] = await db.insert(complaintsTable).values({ userId: userId || null, clinicId: clinicId || null, subject, description, priority: priority || "medium" }).returning();
  res.status(201).json(c);
});

router.patch("/admin/complaints/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.status != null) updates.status = req.body.status;
  if (req.body.priority != null) updates.priority = req.body.priority;
  const [c] = await db.update(complaintsTable).set(updates).where(eq(complaintsTable.id, id)).returning();
  if (!c) { res.status(404).json({ error: "Complaint not found" }); return; }
  res.json(c);
});

router.get("/analytics/bookings", async (req, res): Promise<void> => {
  const { clinicId } = req.query as Record<string, string>;
  const conditions = clinicId ? [eq(appointmentsTable.clinicId, parseInt(clinicId))] : [];
  const appts = conditions.length > 0
    ? await db.select().from(appointmentsTable).where(and(...conditions))
    : await db.select().from(appointmentsTable);

  const dailyMap: Record<string, number> = {};
  for (const a of appts) {
    const d = a.appointmentDate;
    dailyMap[d] = (dailyMap[d] || 0) + 1;
  }
  const dailyBookings = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, count]) => ({ date, count }));
  const statusCounts: Record<string, number> = {};
  for (const a of appts) statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  res.json({ dailyBookings, byStatus, byCategory: [] });
});

router.post("/ai/suggest-clinics", async (req, res): Promise<void> => {
  const { symptom, city } = req.body;
  const symptomLower = symptom.toLowerCase();
  const categoryMap: Record<string, string[]> = {
    dental: ["tooth", "teeth", "gum", "mouth", "jaw", "dental", "cavity"],
    skin: ["skin", "rash", "acne", "eczema", "derma", "itch"],
    eye: ["eye", "vision", "blur", "sight", "glasses"],
    hair: ["hair", "scalp", "bald", "dandruff"],
    ent: ["ear", "nose", "throat", "sinus", "hearing"],
    cardiology: ["heart", "chest", "cardiac", "blood pressure", "palpitation"],
    orthopedic: ["bone", "joint", "knee", "back", "spine", "fracture"],
    pediatric: ["child", "baby", "infant", "kids"],
    general: ["fever", "cold", "flu", "pain", "fatigue", "cough"],
  };

  let matchedCategory = "general";
  let reason = "Based on your symptoms, we recommend visiting a General Clinic.";
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => symptomLower.includes(k))) {
      matchedCategory = cat;
      reason = `Based on your symptoms ("${symptom}"), we recommend visiting a ${cat.charAt(0).toUpperCase() + cat.slice(1)} specialist.`;
      break;
    }
  }

  const conditions: ReturnType<typeof eq>[] = [eq(clinicsTable.status, "approved") as any];
  if (city) conditions.push(eq(clinicsTable.city, city) as any);
  const clinics = await db.select().from(clinicsTable).where(and(...conditions)).limit(6);

  res.json({ category: matchedCategory, reason, clinics });
});

export default router;
