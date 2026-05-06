import { Router, type IRouter } from "express";
import { db, appointmentsTable, doctorsTable, clinicsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/appointments", async (req, res): Promise<void> => {
  const { userId, clinicId, doctorId, status, date, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const conditions = [];
  if (userId) conditions.push(eq(appointmentsTable.userId, parseInt(userId)));
  if (clinicId) conditions.push(eq(appointmentsTable.clinicId, parseInt(clinicId)));
  if (doctorId) conditions.push(eq(appointmentsTable.doctorId, parseInt(doctorId)));
  if (status) conditions.push(eq(appointmentsTable.status, status));
  if (date) conditions.push(eq(appointmentsTable.appointmentDate, date));

  const appts = await db.select({
    id: appointmentsTable.id, userId: appointmentsTable.userId,
    clinicId: appointmentsTable.clinicId, doctorId: appointmentsTable.doctorId,
    appointmentDate: appointmentsTable.appointmentDate, appointmentTime: appointmentsTable.appointmentTime,
    tokenNumber: appointmentsTable.tokenNumber, status: appointmentsTable.status,
    notes: appointmentsTable.notes, consultationFee: appointmentsTable.consultationFee,
    patientName: appointmentsTable.patientName, patientPhone: appointmentsTable.patientPhone,
    clinicName: clinicsTable.name, doctorName: doctorsTable.name,
    createdAt: appointmentsTable.createdAt, updatedAt: appointmentsTable.updatedAt,
  }).from(appointmentsTable)
    .leftJoin(clinicsTable, eq(appointmentsTable.clinicId, clinicsTable.id))
    .leftJoin(doctorsTable, eq(appointmentsTable.doctorId, doctorsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(appointmentsTable.createdAt))
    .limit(parseInt(limit)).offset(parseInt(offset));

  res.json(appts);
});

router.post("/appointments", async (req, res): Promise<void> => {
  const b = req.body;
  const { userId, clinicId, doctorId, appointmentDate, appointmentTime, notes, patientName, patientPhone } = b;

  // Check for double booking
  const existing = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.doctorId, doctorId),
      eq(appointmentsTable.appointmentDate, appointmentDate),
      eq(appointmentsTable.appointmentTime, appointmentTime),
    ));
  const active = existing.filter(a => a.status !== "cancelled");
  if (active.length > 0) {
    res.status(409).json({ error: "This time slot is already booked. Please choose another slot." });
    return;
  }

  // Generate token number
  const dayAppts = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.doctorId, doctorId), eq(appointmentsTable.appointmentDate, appointmentDate)));
  const tokens = dayAppts.filter(a => a.status !== "cancelled").map(a => a.tokenNumber);
  const tokenNumber = tokens.length > 0 ? Math.max(...tokens) + 1 : 1;

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));
  const consultationFee = doctor?.consultationFee || "0";

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const [appt] = await db.insert(appointmentsTable).values({
    userId, clinicId, doctorId, appointmentDate, appointmentTime, tokenNumber,
    status: "confirmed", notes: notes || null, consultationFee,
    patientName: patientName || user?.name || null,
    patientPhone: patientPhone || user?.phone || null,
  }).returning();

  const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, clinicId));
  res.status(201).json({ ...appt, clinicName: clinic?.name || null, doctorName: doctor?.name || null });
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [appt] = await db.select({
    id: appointmentsTable.id, userId: appointmentsTable.userId,
    clinicId: appointmentsTable.clinicId, doctorId: appointmentsTable.doctorId,
    appointmentDate: appointmentsTable.appointmentDate, appointmentTime: appointmentsTable.appointmentTime,
    tokenNumber: appointmentsTable.tokenNumber, status: appointmentsTable.status,
    notes: appointmentsTable.notes, consultationFee: appointmentsTable.consultationFee,
    patientName: appointmentsTable.patientName, patientPhone: appointmentsTable.patientPhone,
    clinicName: clinicsTable.name, doctorName: doctorsTable.name,
    createdAt: appointmentsTable.createdAt, updatedAt: appointmentsTable.updatedAt,
  }).from(appointmentsTable)
    .leftJoin(clinicsTable, eq(appointmentsTable.clinicId, clinicsTable.id))
    .leftJoin(doctorsTable, eq(appointmentsTable.doctorId, doctorsTable.id))
    .where(eq(appointmentsTable.id, id));
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(appt);
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { appointmentDate, appointmentTime, notes, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (appointmentDate != null) updates.appointmentDate = appointmentDate;
  if (appointmentTime != null) updates.appointmentTime = appointmentTime;
  if (notes != null) updates.notes = notes;
  if (status != null) updates.status = status;
  const [appt] = await db.update(appointmentsTable).set(updates).where(eq(appointmentsTable.id, id)).returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(appt);
});

router.post("/appointments/:id/cancel", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [appt] = await db.update(appointmentsTable).set({ status: "cancelled" }).where(eq(appointmentsTable.id, id)).returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(appt);
});

router.post("/appointments/:id/complete", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [appt] = await db.update(appointmentsTable).set({ status: "completed" }).where(eq(appointmentsTable.id, id)).returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(appt);
});

router.get("/clinics/:clinicId/queue", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clinicId) ? req.params.clinicId[0] : req.params.clinicId;
  const clinicId = parseInt(raw, 10);
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const appts = await db.select({
    id: appointmentsTable.id, tokenNumber: appointmentsTable.tokenNumber,
    patientName: appointmentsTable.patientName, appointmentTime: appointmentsTable.appointmentTime,
    status: appointmentsTable.status, doctorName: doctorsTable.name,
  }).from(appointmentsTable)
    .leftJoin(doctorsTable, eq(appointmentsTable.doctorId, doctorsTable.id))
    .where(and(eq(appointmentsTable.clinicId, clinicId), eq(appointmentsTable.appointmentDate, date)))
    .orderBy(appointmentsTable.tokenNumber);

  const queue = appts.map((a, i) => ({
    tokenNumber: a.tokenNumber, patientName: a.patientName,
    appointmentTime: a.appointmentTime, status: a.status,
    doctorName: a.doctorName, waitingAheadCount: appts.slice(0, i).filter(x => x.status === "confirmed" || x.status === "pending").length,
  }));
  res.json(queue);
});

export default router;
