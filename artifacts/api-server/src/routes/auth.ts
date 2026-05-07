import { Router, type IRouter } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const JWT_SECRET = process.env.SESSION_SECRET || "medibook-secret-key";

// In-memory OTP store: key = phone or email, value = { otp, expiresAt, userId? }
const otpStore = new Map<string, { otp: string; expiresAt: number; purpose: string }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcryptjs.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name, email, passwordHash, phone: phone || null,
    role: role || "patient", isVerified: false,
  }).returning();
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  res.status(201).json({ token, user: { ...user, passwordHash: undefined } });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcryptjs.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: { ...user, passwordHash: undefined } });
});

// POST /auth/firebase
router.post("/auth/firebase", async (req, res): Promise<void> => {
  const { idToken, provider } = req.body;
  if (!idToken) {
    res.status(400).json({ error: "idToken required" });
    return;
  }
  try {
    const parts = idToken.split(".");
    let payload: Record<string, string> = {};
    if (parts.length === 3) {
      try {
        payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      } catch {
        payload = {};
      }
    }
    const email = payload.email || `firebase_${Date.now()}@medibook.app`;
    const name = payload.name || email.split("@")[0];
    const firebaseUid = payload.sub || payload.uid || idToken.slice(0, 20);
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      [user] = await db.insert(usersTable).values({
        name, email, firebaseUid, role: "patient", isVerified: true,
      }).returning();
    } else if (!user.firebaseUid) {
      await db.update(usersTable).set({ firebaseUid }).where(eq(usersTable.id, user.id));
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { ...user, passwordHash: undefined } });
  } catch (err) {
    logger.error({ err }, "Firebase auth error");
    res.status(401).json({ error: "Invalid Firebase token" });
  }
});

// POST /auth/send-otp  — sends OTP to phone or email
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { phone, email, purpose = "verify" } = req.body;
  const identifier = phone || email;
  if (!identifier) {
    res.status(400).json({ error: "Phone or email required" });
    return;
  }
  const otp = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(identifier, { otp, expiresAt, purpose });

  // In production: integrate Twilio (SMS) or SendGrid (email)
  // In dev/demo: OTP is returned in response AND logged to console
  logger.info({ identifier, otp, purpose }, "OTP generated");

  const isDev = process.env.NODE_ENV !== "production";
  res.json({
    message: `OTP sent to ${phone ? "phone" : "email"}`,
    // Return OTP in dev mode so it can be shown in UI — remove in production
    ...(isDev && { devOtp: otp }),
  });
});

// POST /auth/verify-otp — verifies OTP
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { phone, email, otp } = req.body;
  const identifier = phone || email;
  if (!identifier || !otp) {
    res.status(400).json({ error: "Identifier and OTP required" });
    return;
  }
  const stored = otpStore.get(identifier);
  if (!stored) {
    res.status(400).json({ error: "No OTP found. Please request a new one." });
    return;
  }
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(identifier);
    res.status(400).json({ error: "OTP expired. Please request a new one." });
    return;
  }
  if (stored.otp !== String(otp)) {
    res.status(400).json({ error: "Incorrect OTP" });
    return;
  }
  otpStore.delete(identifier);

  // Mark user as verified
  if (phone) {
    await db.update(usersTable).set({ isVerified: true }).where(eq(usersTable.phone, phone));
  } else if (email) {
    await db.update(usersTable).set({ isVerified: true }).where(eq(usersTable.email, email));
  }

  // Return fresh token if user exists
  let token: string | undefined;
  let user: any;
  const clause = phone ? eq(usersTable.phone, phone) : eq(usersTable.email, email!);
  const [found] = await db.select().from(usersTable).where(clause);
  if (found) {
    token = jwt.sign({ id: found.id, email: found.email, role: found.role }, JWT_SECRET, { expiresIn: "30d" });
    user = { ...found, passwordHash: undefined };
  }

  res.json({ verified: true, ...(token && { token, user }) });
});

// GET /auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ ...user, passwordHash: undefined });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
