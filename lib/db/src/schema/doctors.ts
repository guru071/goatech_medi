import { pgTable, text, serial, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const doctorsTable = pgTable("doctors", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").notNull(),
  name: text("name").notNull(),
  qualification: text("qualification").notNull(),
  specialization: text("specialization").notNull(),
  experience: integer("experience").notNull().default(0),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  bio: text("bio"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  availableDays: text("available_days").notNull().default("Mon,Tue,Wed,Thu,Fri"),
  startTime: text("start_time").notNull().default("09:00"),
  endTime: text("end_time").notNull().default("17:00"),
  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctorsTable.$inferSelect;
