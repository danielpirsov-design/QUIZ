import { Router, type IRouter } from "express";
import { db, usersTable, verificationCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";
import { Resend } from "resend";

// Resend via Replit connector
async function getResendClient(): Promise<{ client: Resend; fromEmail: string } | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    if (!hostname) return null;
    const xReplitToken = process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;
    if (!xReplitToken) return null;
    const res = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
      { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
    );
    const data = await res.json() as any;
    const settings = data.items?.[0]?.settings;
    if (!settings?.api_key) return null;
    return { client: new Resend(settings.api_key), fromEmail: settings.from_email || "noreply@qwizds.com" };
  } catch {
    return null;
  }
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  const resend = await getResendClient();
  if (!resend) {
    console.log(`[OTP] No Resend connector — code for ${email}: ${code}`);
    return;
  }
  await resend.client.emails.send({
    from: `QUIZDES <${resend.fromEmail}>`,
    to: email,
    subject: "Your QUIZDES verification code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#060612;color:#fff;border-radius:16px">
        <h1 style="color:#a855f7;font-size:2rem;margin:0 0 8px">QUIZDES</h1>
        <p style="color:#ccc;margin:0 0 24px">Here is your 6-digit verification code:</p>
        <div style="background:#1a1a2e;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:2.5rem;font-weight:900;color:#fbbf24">${code}</div>
        <p style="color:#888;font-size:0.85rem;margin:20px 0 0">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
}

const router: IRouter = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function getRedirectUri(req: any): string {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}/api/auth/google/callback`;
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const session = (req as any).session;
  if (!session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, username, password, displayName, role } = req.body;
  if (!email || !username || !password || !displayName || !role) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }
  const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existingUsername.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    email,
    username,
    passwordHash: hashPassword(password),
    displayName,
    role,
    emailVerified: false,
  }).returning();
  (req as any).session = { userId: user.id };

  // Send OTP automatically after registration
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(verificationCodesTable).values({ userId: user.id, code, type: "email_verify", expiresAt });
  await sendOtpEmail(user.email, code).catch(e => console.error("OTP send error:", e));

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ ...safeUser, requiresVerification: true });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  (req as any).session = { userId: user.id };
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  (req as any).session = null;
  res.json({ success: true });
});

router.patch("/auth/me", async (req, res): Promise<void> => {
  const session = (req as any).session;
  if (!session?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { displayName, avatarUrl } = req.body;
  const updates: Record<string, string | null> = {};
  if (typeof displayName === "string" && displayName.trim()) updates.displayName = displayName.trim();
  if (typeof avatarUrl === "string") updates.avatarUrl = avatarUrl.trim() || null;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [user] = await db.update(usersTable).set(updates as any).where(eq(usersTable.id, session.userId)).returning();
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.post("/auth/update-role", async (req, res): Promise<void> => {
  const session = (req as any).session;
  if (!session?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { role } = req.body;
  if (!["teacher", "student", "creator", "owner"].includes(role)) {
    res.status(400).json({ error: "Invalid role" }); return;
  }
  const [user] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, session.userId)).returning();
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.get("/auth/google", (req, res): void => {
  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const { code, error } = req.query as { code?: string; error?: string };

  if (error || !code) {
    res.redirect("/?error=google_denied");
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json() as any;
    if (!tokens.access_token) {
      res.redirect("/?error=google_token");
      return;
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json() as any;

    if (!googleUser.email) {
      res.redirect("/?error=google_no_email");
      return;
    }

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, googleUser.email));
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const baseUsername = (googleUser.email.split("@")[0] ?? "user").replace(/[^a-z0-9_]/gi, "").toLowerCase();
      let username = baseUsername;
      let suffix = 1;
      while (true) {
        const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
        if (!existing) break;
        username = `${baseUsername}${suffix++}`;
      }
      [user] = await db.insert(usersTable).values({
        email: googleUser.email,
        username,
        passwordHash: hashPassword(Math.random().toString(36)),
        displayName: googleUser.name ?? googleUser.email.split("@")[0],
        role: "teacher",
        avatarUrl: googleUser.picture ?? null,
        emailVerified: true,
      }).returning();
    }

    (req as any).session = { userId: user.id };
    res.redirect(isNewUser ? "/onboarding" : "/dashboard");
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect("/?error=google_failed");
  }
});

router.post("/auth/send-code", async (req, res): Promise<void> => {
  const session = (req as any).session;
  if (!session?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.emailVerified) { res.json({ alreadyVerified: true }); return; }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(verificationCodesTable).values({ userId: user.id, code, type: "email_verify", expiresAt });
  await sendOtpEmail(user.email, code).catch(e => console.error("OTP send error:", e));

  res.json({ sent: true, email: user.email });
});

router.post("/auth/verify-code", async (req, res): Promise<void> => {
  const session = (req as any).session;
  if (!session?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: "Code required" }); return; }

  const now = new Date();
  const [record] = await db.select().from(verificationCodesTable).where(
    and(
      eq(verificationCodesTable.userId, session.userId),
      eq(verificationCodesTable.code, code),
      eq(verificationCodesTable.type, "email_verify"),
      eq(verificationCodesTable.used, false),
      gt(verificationCodesTable.expiresAt, now),
    )
  );

  if (!record) { res.status(400).json({ error: "Invalid or expired code" }); return; }

  await db.update(verificationCodesTable).set({ used: true }).where(eq(verificationCodesTable.id, record.id));
  await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, session.userId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  const { passwordHash: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

router.get("/admin/users", async (req, res): Promise<void> => {
  const session = (req as any).session;
  if (!session?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!me || me.role !== "owner") { res.status(403).json({ error: "Forbidden" }); return; }
  const users = await db.select({
    id: usersTable.id,
    displayName: usersTable.displayName,
    email: usersTable.email,
    role: usersTable.role,
    avatarUrl: usersTable.avatarUrl,
  }).from(usersTable).orderBy(usersTable.displayName);
  res.json(users);
});

router.patch("/admin/users/:id/role", async (req, res): Promise<void> => {
  const session = (req as any).session;
  if (!session?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!me || me.role !== "owner") { res.status(403).json({ error: "Forbidden" }); return; }
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { role } = req.body;
  if (!["student", "teacher", "creator", "owner"].includes(role)) {
    res.status(400).json({ error: "Invalid role" }); return;
  }
  const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, targetId)).returning({
    id: usersTable.id,
    displayName: usersTable.displayName,
    email: usersTable.email,
    role: usersTable.role,
    avatarUrl: usersTable.avatarUrl,
  });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

export default router;
