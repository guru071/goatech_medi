import { Router, type IRouter } from "express";
import { db, clinicsTable, categoriesTable, doctorsTable, reviewsTable, appointmentsTable, paymentsTable, subscriptionsTable } from "@workspace/db";
import { eq, and, ilike, sql, desc, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/clinics", async (req, res): Promise<void> => {
  const { category, search, city, status, subscriptionPlan, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const conditions = [];
  if (status) conditions.push(eq(clinicsTable.status, status));
  else conditions.push(eq(clinicsTable.status, "approved"));
  if (category) conditions.push(eq(categoriesTable.slug, category));
  if (city) conditions.push(ilike(clinicsTable.city, `%${city}%`));
  if (subscriptionPlan) conditions.push(eq(clinicsTable.subscriptionPlan, subscriptionPlan));
  if (search) conditions.push(ilike(clinicsTable.name, `%${search}%`));

  const clinics = await db
    .select({
      id: clinicsTable.id, name: clinicsTable.name, ownerName: clinicsTable.ownerName,
      ownerId: clinicsTable.ownerId, categoryId: clinicsTable.categoryId,
      categoryName: categoriesTable.name, email: clinicsTable.email, phone: clinicsTable.phone,
      address: clinicsTable.address, city: clinicsTable.city, state: clinicsTable.state,
      pincode: clinicsTable.pincode, latitude: clinicsTable.latitude, longitude: clinicsTable.longitude,
      logoUrl: clinicsTable.logoUrl, whatsappNumber: clinicsTable.whatsappNumber,
      instagramUrl: clinicsTable.instagramUrl, websiteUrl: clinicsTable.websiteUrl,
      subscriptionPlan: clinicsTable.subscriptionPlan, status: clinicsTable.status,
      rating: clinicsTable.rating, reviewCount: clinicsTable.reviewCount,
      isEmergencyAvailable: clinicsTable.isEmergencyAvailable,
      workingHours: clinicsTable.workingHours, createdAt: clinicsTable.createdAt, updatedAt: clinicsTable.updatedAt,
    })
    .from(clinicsTable)
    .leftJoin(categoriesTable, eq(clinicsTable.categoryId, categoriesTable.id))
    .where(and(...conditions))
    .orderBy(desc(clinicsTable.subscriptionPlan), desc(clinicsTable.rating))
    .limit(parseInt(limit)).offset(parseInt(offset));

  const totalResult = await db.select({ count: count() }).from(clinicsTable)
    .leftJoin(categoriesTable, eq(clinicsTable.categoryId, categoriesTable.id))
    .where(and(...conditions));
  const total = Number(totalResult[0]?.count ?? 0);

  res.json({ clinics, total, hasMore: parseInt(offset) + clinics.length < total });
});

router.get("/clinics/featured", async (_req, res): Promise<void> => {
  const clinics = await db.select({
    id: clinicsTable.id, name: clinicsTable.name, ownerName: clinicsTable.ownerName,
    ownerId: clinicsTable.ownerId, categoryId: clinicsTable.categoryId,
    categoryName: categoriesTable.name, email: clinicsTable.email, phone: clinicsTable.phone,
    address: clinicsTable.address, city: clinicsTable.city, state: clinicsTable.state,
    pincode: clinicsTable.pincode, latitude: clinicsTable.latitude, longitude: clinicsTable.longitude,
    logoUrl: clinicsTable.logoUrl, whatsappNumber: clinicsTable.whatsappNumber,
    instagramUrl: clinicsTable.instagramUrl, websiteUrl: clinicsTable.websiteUrl,
    subscriptionPlan: clinicsTable.subscriptionPlan, status: clinicsTable.status,
    rating: clinicsTable.rating, reviewCount: clinicsTable.reviewCount,
    isEmergencyAvailable: clinicsTable.isEmergencyAvailable,
    workingHours: clinicsTable.workingHours, createdAt: clinicsTable.createdAt, updatedAt: clinicsTable.updatedAt,
  }).from(clinicsTable)
    .leftJoin(categoriesTable, eq(clinicsTable.categoryId, categoriesTable.id))
    .where(and(eq(clinicsTable.status, "approved"), eq(clinicsTable.subscriptionPlan, "premium")))
    .orderBy(desc(clinicsTable.rating)).limit(8);
  res.json(clinics);
});

router.get("/clinics/nearby", async (req, res): Promise<void> => {
  const { lat, lng, radius = "10", category } = req.query as Record<string, string>;
  if (!lat || !lng) { res.status(400).json({ error: "lat and lng are required" }); return; }
  const latN = parseFloat(lat), lngN = parseFloat(lng), radiusN = parseFloat(radius);
  const conditions: ReturnType<typeof eq>[] = [eq(clinicsTable.status, "approved") as any];
  if (category) conditions.push(eq(categoriesTable.slug, category) as any);
  const clinics = await db.select({
    id: clinicsTable.id, name: clinicsTable.name, ownerName: clinicsTable.ownerName,
    ownerId: clinicsTable.ownerId, categoryId: clinicsTable.categoryId,
    categoryName: categoriesTable.name, email: clinicsTable.email, phone: clinicsTable.phone,
    address: clinicsTable.address, city: clinicsTable.city, state: clinicsTable.state,
    pincode: clinicsTable.pincode, latitude: clinicsTable.latitude, longitude: clinicsTable.longitude,
    logoUrl: clinicsTable.logoUrl, whatsappNumber: clinicsTable.whatsappNumber,
    instagramUrl: clinicsTable.instagramUrl, websiteUrl: clinicsTable.websiteUrl,
    subscriptionPlan: clinicsTable.subscriptionPlan, status: clinicsTable.status,
    rating: clinicsTable.rating, reviewCount: clinicsTable.reviewCount,
    isEmergencyAvailable: clinicsTable.isEmergencyAvailable,
    workingHours: clinicsTable.workingHours, createdAt: clinicsTable.createdAt, updatedAt: clinicsTable.updatedAt,
  }).from(clinicsTable)
    .leftJoin(categoriesTable, eq(clinicsTable.categoryId, categoriesTable.id))
    .where(and(...conditions))
    .limit(20);

  const nearby = clinics.filter(c => {
    if (!c.latitude || !c.longitude) return true;
    const dLat = (parseFloat(String(c.latitude)) - latN) * Math.PI / 180;
    const dLng = (parseFloat(String(c.longitude)) - lngN) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(latN*Math.PI/180)*Math.cos(parseFloat(String(c.latitude))*Math.PI/180)*Math.sin(dLng/2)**2;
    const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return dist <= radiusN;
  });
  res.json(nearby);
});

router.get("/clinics/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [clinic] = await db.select({
    id: clinicsTable.id, name: clinicsTable.name, ownerName: clinicsTable.ownerName,
    ownerId: clinicsTable.ownerId, categoryId: clinicsTable.categoryId,
    categoryName: categoriesTable.name, email: clinicsTable.email, phone: clinicsTable.phone,
    address: clinicsTable.address, city: clinicsTable.city, state: clinicsTable.state,
    pincode: clinicsTable.pincode, latitude: clinicsTable.latitude, longitude: clinicsTable.longitude,
    logoUrl: clinicsTable.logoUrl, photos: clinicsTable.photos, services: clinicsTable.services,
    whatsappNumber: clinicsTable.whatsappNumber, instagramUrl: clinicsTable.instagramUrl,
    websiteUrl: clinicsTable.websiteUrl, subscriptionPlan: clinicsTable.subscriptionPlan,
    status: clinicsTable.status, rating: clinicsTable.rating, reviewCount: clinicsTable.reviewCount,
    isEmergencyAvailable: clinicsTable.isEmergencyAvailable, workingHours: clinicsTable.workingHours,
    createdAt: clinicsTable.createdAt, updatedAt: clinicsTable.updatedAt,
  }).from(clinicsTable)
    .leftJoin(categoriesTable, eq(clinicsTable.categoryId, categoriesTable.id))
    .where(eq(clinicsTable.id, id));
  if (!clinic) { res.status(404).json({ error: "Clinic not found" }); return; }
  const doctors = await db.select().from(doctorsTable).where(eq(doctorsTable.clinicId, id));
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.clinicId, id)).limit(10);
  res.json({ ...clinic, doctors, reviews, photos: clinic.photos || [], services: clinic.services || [] });
});

router.post("/clinics", async (req, res): Promise<void> => {
  const body = req.body;
  const [clinic] = await db.insert(clinicsTable).values({
    name: body.name, ownerName: body.ownerName, ownerId: body.ownerId,
    categoryId: body.categoryId, email: body.email, phone: body.phone,
    address: body.address, city: body.city, state: body.state, pincode: body.pincode,
    latitude: body.latitude?.toString(), longitude: body.longitude?.toString(),
    logoUrl: body.logoUrl, photos: body.photos || [], services: body.services || [],
    whatsappNumber: body.whatsappNumber, instagramUrl: body.instagramUrl,
    websiteUrl: body.websiteUrl, subscriptionPlan: body.subscriptionPlan || "basic",
    workingHours: body.workingHours, isEmergencyAvailable: body.isEmergencyAvailable || false,
    status: "pending",
  }).returning();
  res.status(201).json(clinic);
});

router.patch("/clinics/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const b = req.body;
  const updates: Record<string, unknown> = {};
  const fields = ["name","email","phone","address","city","state","pincode","logoUrl","whatsappNumber","instagramUrl","websiteUrl","workingHours","isEmergencyAvailable","services","photos"];
  for (const f of fields) if (b[f] != null) updates[f] = b[f];
  if (b.latitude != null) updates.latitude = b.latitude.toString();
  if (b.longitude != null) updates.longitude = b.longitude.toString();
  const [clinic] = await db.update(clinicsTable).set(updates).where(eq(clinicsTable.id, id)).returning();
  if (!clinic) { res.status(404).json({ error: "Clinic not found" }); return; }
  res.json(clinic);
});

router.delete("/clinics/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(clinicsTable).where(eq(clinicsTable.id, id));
  res.sendStatus(204);
});

router.post("/clinics/:id/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [clinic] = await db.update(clinicsTable).set({ status: "approved", rejectionReason: null }).where(eq(clinicsTable.id, id)).returning();
  if (!clinic) { res.status(404).json({ error: "Clinic not found" }); return; }
  res.json(clinic);
});

router.post("/clinics/:id/reject", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { reason } = req.body;
  const [clinic] = await db.update(clinicsTable).set({ status: "rejected", rejectionReason: reason }).where(eq(clinicsTable.id, id)).returning();
  if (!clinic) { res.status(404).json({ error: "Clinic not found" }); return; }
  res.json(clinic);
});

router.get("/clinics/:clinicId/stats", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clinicId) ? req.params.clinicId[0] : req.params.clinicId;
  const clinicId = parseInt(raw, 10);
  const allAppts = await db.select().from(appointmentsTable).where(eq(appointmentsTable.clinicId, clinicId));
  const today = new Date().toISOString().split("T")[0];
  const todayAppts = allAppts.filter(a => a.appointmentDate === today);
  const completed = allAppts.filter(a => a.status === "completed");
  const pending = allAppts.filter(a => a.status === "pending" || a.status === "confirmed");
  const totalRevenue = completed.reduce((s, a) => s + parseFloat(String(a.consultationFee || 0)), 0);
  const uniquePatients = new Set(allAppts.map(a => a.userId)).size;
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.clinicId, clinicId));
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  const monthlyRevenue: Array<{ month: string; revenue: number; appointments: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7);
    const monthAppts = completed.filter(a => a.appointmentDate.startsWith(monthStr));
    monthlyRevenue.push({ month: d.toLocaleString("default", { month: "short" }), revenue: monthAppts.reduce((s, a) => s + parseFloat(String(a.consultationFee || 0)), 0), appointments: monthAppts.length });
  }

  res.json({
    totalAppointments: allAppts.length, todayAppointments: todayAppts.length,
    totalPatients: uniquePatients, totalRevenue, pendingAppointments: pending.length,
    completedAppointments: completed.length, averageRating: avgRating, monthlyRevenue,
  });
});

export default router;
