import { Router, type IRouter } from "express";
import { db, doctorsTable, appointmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/clinics/:clinicId/doctors", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clinicId) ? req.params.clinicId[0] : req.params.clinicId;
  const clinicId = parseInt(raw, 10);
  const doctors = await db.select().from(doctorsTable).where(eq(doctorsTable.clinicId, clinicId));
  res.json(doctors);
});

router.post("/clinics/:clinicId/doctors", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clinicId) ? req.params.clinicId[0] : req.params.clinicId;
  const clinicId = parseInt(raw, 10);
  const b = req.body;
  const [doctor] = await db.insert(doctorsTable).values({
    clinicId, name: b.name, qualification: b.qualification, specialization: b.specialization,
    experience: b.experience, consultationFee: b.consultationFee.toString(),
    imageUrl: b.imageUrl || null, bio: b.bio || null,
    availableDays: b.availableDays || "Mon,Tue,Wed,Thu,Fri",
    startTime: b.startTime || "09:00", endTime: b.endTime || "17:00",
    slotDurationMinutes: b.slotDurationMinutes || 30, isActive: true,
  }).returning();
  res.status(201).json(doctor);
});

router.get("/doctors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id));
  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }
  res.json(doctor);
});

router.patch("/doctors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const b = req.body;
  const updates: Record<string, unknown> = {};
  const fields = ["name","qualification","specialization","experience","imageUrl","bio","availableDays","startTime","endTime","slotDurationMinutes","isActive"];
  for (const f of fields) if (b[f] != null) updates[f] = b[f];
  if (b.consultationFee != null) updates.consultationFee = b.consultationFee.toString();
  const [doctor] = await db.update(doctorsTable).set(updates).where(eq(doctorsTable.id, id)).returning();
  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }
  res.json(doctor);
});

router.delete("/doctors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(doctorsTable).where(eq(doctorsTable.id, id));
  res.sendStatus(204);
});

router.get("/doctors/:id/slots", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { date } = req.query as { date: string };
  if (!date) { res.status(400).json({ error: "date is required" }); return; }

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id));
  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }

  const bookedAppts = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.doctorId, id), eq(appointmentsTable.appointmentDate, date)));
  const bookedTimes = new Set(bookedAppts.filter(a => a.status !== "cancelled").map(a => a.appointmentTime));
  const bookedTokens = bookedAppts.filter(a => a.status !== "cancelled").map(a => a.tokenNumber);
  const maxToken = bookedTokens.length > 0 ? Math.max(...bookedTokens) : 0;

  const slots = [];
  const [startH, startM] = doctor.startTime.split(":").map(Number);
  const [endH, endM] = doctor.endTime.split(":").map(Number);
  let cur = startH * 60 + startM;
  const end = endH * 60 + endM;
  let token = 1;
  while (cur < end) {
    const h = Math.floor(cur / 60).toString().padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    const time = `${h}:${m}`;
    const isBooked = bookedTimes.has(time);
    slots.push({ time, token, isAvailable: !isBooked });
    cur += doctor.slotDurationMinutes;
    token++;
  }
  res.json(slots);
});

export default router;
