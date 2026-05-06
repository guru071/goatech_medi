import { Router, type IRouter } from "express";
import { db, chatRoomsTable, chatMessagesTable, usersTable, clinicsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/chats/rooms", async (req, res): Promise<void> => {
  const { userId, clinicId } = req.query as Record<string, string>;
  const conditions = [];
  if (userId) conditions.push(eq(chatRoomsTable.userId, parseInt(userId)));
  if (clinicId) conditions.push(eq(chatRoomsTable.clinicId, parseInt(clinicId)));

  const rooms = await db.select({
    id: chatRoomsTable.id, clinicId: chatRoomsTable.clinicId, userId: chatRoomsTable.userId,
    lastMessage: chatRoomsTable.lastMessage, lastMessageAt: chatRoomsTable.lastMessageAt,
    clinicName: clinicsTable.name, userName: usersTable.name, createdAt: chatRoomsTable.createdAt,
  }).from(chatRoomsTable)
    .leftJoin(clinicsTable, eq(chatRoomsTable.clinicId, clinicsTable.id))
    .leftJoin(usersTable, eq(chatRoomsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(chatRoomsTable.lastMessageAt));

  res.json(rooms.map(r => ({ ...r, unreadCount: 0 })));
});

router.post("/chats/rooms", async (req, res): Promise<void> => {
  const { clinicId, userId } = req.body;
  const existing = await db.select().from(chatRoomsTable)
    .where(and(eq(chatRoomsTable.clinicId, clinicId), eq(chatRoomsTable.userId, userId)));
  if (existing.length > 0) {
    const clinic = await db.select().from(clinicsTable).where(eq(clinicsTable.id, clinicId));
    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    res.status(201).json({ ...existing[0], clinicName: clinic[0]?.name, userName: user[0]?.name, unreadCount: 0 });
    return;
  }
  const [room] = await db.insert(chatRoomsTable).values({ clinicId, userId }).returning();
  const clinic = await db.select().from(clinicsTable).where(eq(clinicsTable.id, clinicId));
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...room, clinicName: clinic[0]?.name, userName: user[0]?.name, unreadCount: 0 });
});

router.get("/chats/rooms/:roomId/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
  const roomId = parseInt(raw, 10);
  const { limit = "50", offset = "0" } = req.query as Record<string, string>;
  const messages = await db.select({
    id: chatMessagesTable.id, roomId: chatMessagesTable.roomId,
    senderId: chatMessagesTable.senderId, senderRole: chatMessagesTable.senderRole,
    content: chatMessagesTable.content, messageType: chatMessagesTable.messageType,
    createdAt: chatMessagesTable.createdAt, senderName: usersTable.name,
  }).from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(eq(chatMessagesTable.roomId, roomId))
    .orderBy(chatMessagesTable.createdAt)
    .limit(parseInt(limit)).offset(parseInt(offset));
  res.json(messages);
});

router.post("/chats/rooms/:roomId/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
  const roomId = parseInt(raw, 10);
  const { senderId, senderRole, content, messageType } = req.body;
  const [msg] = await db.insert(chatMessagesTable).values({
    roomId, senderId, senderRole, content, messageType: messageType || "text",
  }).returning();
  await db.update(chatRoomsTable).set({ lastMessage: content, lastMessageAt: new Date() }).where(eq(chatRoomsTable.id, roomId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, senderId));
  res.status(201).json({ ...msg, senderName: user?.name || null });
});

export default router;
