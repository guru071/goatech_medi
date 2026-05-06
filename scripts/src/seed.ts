import {
  db, usersTable, categoriesTable, clinicsTable, doctorsTable,
  appointmentsTable, reviewsTable, subscriptionsTable, complaintsTable
} from "@workspace/db";
import bcryptjs from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Categories
  const cats = await db.insert(categoriesTable).values([
    { name: "Dental", slug: "dental", icon: "🦷", description: "Teeth & oral health", color: "#0d9488" },
    { name: "Skin & Dermatology", slug: "skin", icon: "✨", description: "Skin, hair & cosmetic", color: "#7c3aed" },
    { name: "Eye Care", slug: "eye", icon: "👁", description: "Vision & ophthalmology", color: "#2563eb" },
    { name: "Hair Care", slug: "hair", icon: "💆", description: "Hair & scalp treatment", color: "#d97706" },
    { name: "ENT", slug: "ent", icon: "👂", description: "Ear, nose & throat", color: "#059669" },
    { name: "Cardiology", slug: "cardiology", icon: "❤️", description: "Heart & cardiovascular", color: "#dc2626" },
    { name: "Orthopedic", slug: "orthopedic", icon: "🦴", description: "Bones & joints", color: "#7c3aed" },
    { name: "Pediatric", slug: "pediatric", icon: "👶", description: "Child health", color: "#db2777" },
    { name: "General Medicine", slug: "general", icon: "🏥", description: "Primary care", color: "#0891b2" },
    { name: "Cosmetic Surgery", slug: "cosmetic", icon: "💄", description: "Aesthetic procedures", color: "#be185d" },
  ]).onConflictDoNothing().returning();

  console.log(`Categories: ${cats.length}`);

  // Users
  const pwHash = await bcryptjs.hash("password123", 10);
  const users = await db.insert(usersTable).values([
    { name: "Admin User", email: "admin@medibook.pro", passwordHash: pwHash, role: "admin", isVerified: true },
    { name: "Raj Clinic Owner", email: "owner@medibook.pro", passwordHash: pwHash, role: "clinic_owner", phone: "9876543210", isVerified: true },
    { name: "Priya Patient", email: "patient@medibook.pro", passwordHash: pwHash, role: "patient", phone: "9898989898", isVerified: true },
    { name: "Dr. Test Admin", email: "test@test.com", passwordHash: pwHash, role: "patient", isVerified: true },
  ]).onConflictDoNothing().returning();

  console.log(`Users: ${users.length}`);

  const allCats = await db.select().from(categoriesTable);
  const dentalCat = allCats.find(c => c.slug === "dental");
  const skinCat = allCats.find(c => c.slug === "skin");
  const eyeCat = allCats.find(c => c.slug === "eye");
  const generalCat = allCats.find(c => c.slug === "general");

  const allUsers = await db.select().from(usersTable);
  const owner = allUsers.find(u => u.role === "clinic_owner");
  const patient = allUsers.find(u => u.role === "patient");

  if (!owner || !dentalCat) {
    console.log("Skipping clinics — owner or categories not found");
    return;
  }

  // Clinics
  const clinics = await db.insert(clinicsTable).values([
    {
      name: "SmilePro Dental Clinic", ownerName: owner.name, ownerId: owner.id,
      categoryId: dentalCat!.id, email: "smile@example.com", phone: "9800000001",
      address: "45 Main Street, Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400058",
      latitude: "19.1360", longitude: "72.8262",
      workingHours: "Mon-Sat: 9 AM - 8 PM", subscriptionPlan: "premium", status: "approved",
      isEmergencyAvailable: true, rating: "4.8", reviewCount: 47,
      whatsappNumber: "9800000001", instagramUrl: "https://instagram.com/smileproclini",
      services: ["Root Canal", "Teeth Whitening", "Orthodontics", "Implants", "Scaling"],
    },
    {
      name: "SkinGlow Dermatology Center", ownerName: owner.name, ownerId: owner.id,
      categoryId: skinCat!.id, email: "skinglow@example.com", phone: "9800000002",
      address: "12 Park Lane, Bandra", city: "Mumbai", state: "Maharashtra", pincode: "400050",
      latitude: "19.0543", longitude: "72.8296",
      workingHours: "Tue-Sun: 10 AM - 7 PM", subscriptionPlan: "premium", status: "approved",
      isEmergencyAvailable: false, rating: "4.6", reviewCount: 32,
      whatsappNumber: "9800000002",
      services: ["Acne Treatment", "Laser Hair Removal", "Chemical Peels", "Anti-aging", "PRP"],
    },
    {
      name: "ClearVision Eye Hospital", ownerName: owner.name, ownerId: owner.id,
      categoryId: eyeCat!.id, email: "clearvision@example.com", phone: "9800000003",
      address: "77 Linking Road, Santacruz", city: "Mumbai", state: "Maharashtra", pincode: "400054",
      latitude: "19.0817", longitude: "72.8427",
      workingHours: "Mon-Fri: 8 AM - 6 PM, Sat: 9 AM - 2 PM", subscriptionPlan: "basic", status: "approved",
      isEmergencyAvailable: true, rating: "4.5", reviewCount: 28,
      services: ["LASIK", "Cataract Surgery", "Glaucoma Treatment", "Eye Exams"],
    },
    {
      name: "Apollo Health Clinic", ownerName: owner.name, ownerId: owner.id,
      categoryId: generalCat!.id, email: "apollo@example.com", phone: "9800000004",
      address: "23 Civil Lines, Connaught Place", city: "New Delhi", state: "Delhi", pincode: "110001",
      latitude: "28.6315", longitude: "77.2167",
      workingHours: "24x7 Emergency", subscriptionPlan: "enterprise", status: "approved",
      isEmergencyAvailable: true, rating: "4.9", reviewCount: 102,
      services: ["General Medicine", "Pathology", "X-Ray", "ECG", "Health Checkups"],
    },
    {
      name: "Healing Hands Multi-Specialty", ownerName: "Dr. Meera Kapoor", ownerId: owner.id,
      categoryId: dentalCat!.id, email: "healing@example.com", phone: "9800000005",
      address: "88 MG Road, Koramangala", city: "Bengaluru", state: "Karnataka", pincode: "560034",
      latitude: "12.9352", longitude: "77.6244",
      workingHours: "Mon-Sat: 9 AM - 9 PM", subscriptionPlan: "premium", status: "pending",
      isEmergencyAvailable: false, rating: null, reviewCount: 0,
    },
  ]).onConflictDoNothing().returning();

  console.log(`Clinics: ${clinics.length}`);

  const allClinics = await db.select().from(clinicsTable);
  const smilePro = allClinics.find(c => c.name === "SmilePro Dental Clinic");

  if (smilePro) {
    const doctors = await db.insert(doctorsTable).values([
      {
        clinicId: smilePro.id, name: "Dr. Anita Sharma", qualification: "BDS, MDS", specialization: "Orthodontics",
        experience: 8, consultationFee: "500", imageUrl: null, bio: "Expert in braces and smile correction. 8+ years experience.",
        availableDays: "Mon,Tue,Wed,Thu,Fri", startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, isActive: true,
      },
      {
        clinicId: smilePro.id, name: "Dr. Vikram Patel", qualification: "BDS, MDS", specialization: "Endodontics",
        experience: 12, consultationFee: "700", bio: "Root canal specialist with painless treatment approach.",
        availableDays: "Mon,Wed,Fri,Sat", startTime: "10:00", endTime: "18:00", slotDurationMinutes: 45, isActive: true,
      },
    ]).onConflictDoNothing().returning();
    console.log(`Doctors: ${doctors.length}`);

    if (patient && doctors.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      await db.insert(appointmentsTable).values([
        {
          userId: patient.id, clinicId: smilePro.id, doctorId: doctors[0].id,
          appointmentDate: today, appointmentTime: "10:00", tokenNumber: 1,
          status: "confirmed", patientName: patient.name, patientPhone: patient.phone, consultationFee: "500",
        },
        {
          userId: patient.id, clinicId: smilePro.id, doctorId: doctors[0].id,
          appointmentDate: tomorrow, appointmentTime: "11:30", tokenNumber: 2,
          status: "pending", patientName: patient.name, patientPhone: patient.phone, consultationFee: "500",
        },
      ]).onConflictDoNothing();
      console.log("Appointments seeded");

      await db.insert(reviewsTable).values([
        { clinicId: smilePro.id, userId: patient.id, rating: 5, comment: "Excellent service! Dr. Anita is very professional." },
        { clinicId: smilePro.id, userId: patient.id, rating: 4, comment: "Good experience, short waiting time." },
      ]).onConflictDoNothing();
      console.log("Reviews seeded");
    }
  }

  await db.insert(subscriptionsTable).values([
    { clinicId: allClinics[0]?.id, plan: "premium", status: "active", startDate: "2025-01-01", endDate: "2025-12-31" },
    { clinicId: allClinics[1]?.id, plan: "premium", status: "active", startDate: "2025-01-01", endDate: "2025-12-31" },
    { clinicId: allClinics[3]?.id, plan: "enterprise", status: "active", startDate: "2025-01-01", endDate: "2025-12-31" },
  ]).onConflictDoNothing();

  await db.insert(complaintsTable).values([
    { userId: patient?.id, subject: "Long wait time at SmilePro", description: "Waited 2 hours despite having an appointment. Staff were not helpful.", priority: "medium", status: "open" },
    { userId: patient?.id, subject: "Doctor cancelled last minute", description: "Dr. Vikram cancelled my appointment 30 minutes before without notice.", priority: "high", status: "in_progress" },
  ]).onConflictDoNothing();

  console.log("Seed complete!");
  console.log("Demo credentials:");
  console.log("  Admin: admin@medibook.pro / password123");
  console.log("  Clinic Owner: owner@medibook.pro / password123");
  console.log("  Patient: patient@medibook.pro / password123");
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
