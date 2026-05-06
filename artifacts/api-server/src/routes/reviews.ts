import { Router, type IRouter } from "express";
import { db, reviewsTable, clinicsTable, usersTable } from "@workspace/db";
import { eq, avg } from "drizzle-orm";

const router: IRouter = Router();

router.get("/clinics/:clinicId/reviews", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clinicId) ? req.params.clinicId[0] : req.params.clinicId;
  const clinicId = parseInt(raw, 10);
  const reviews = await db.select({
    id: reviewsTable.id, clinicId: reviewsTable.clinicId, userId: reviewsTable.userId,
    rating: reviewsTable.rating, comment: reviewsTable.comment, createdAt: reviewsTable.createdAt,
    userName: usersTable.name, userAvatarUrl: usersTable.avatarUrl,
  }).from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.clinicId, clinicId));
  res.json(reviews);
});

router.post("/clinics/:clinicId/reviews", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clinicId) ? req.params.clinicId[0] : req.params.clinicId;
  const clinicId = parseInt(raw, 10);
  const { userId, rating, comment } = req.body;
  const [review] = await db.insert(reviewsTable).values({ clinicId, userId, rating, comment: comment || null }).returning();

  // Update clinic rating
  const avgResult = await db.select({ avg: avg(reviewsTable.rating) }).from(reviewsTable).where(eq(reviewsTable.clinicId, clinicId));
  const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.clinicId, clinicId));
  await db.update(clinicsTable).set({
    rating: avgResult[0]?.avg?.toString() || null,
    reviewCount: allReviews.length,
  }).where(eq(clinicsTable.id, clinicId));

  res.status(201).json(review);
});

export default router;
