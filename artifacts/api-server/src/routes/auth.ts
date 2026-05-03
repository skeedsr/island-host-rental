import { Router } from "express";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/password";

const router = Router();

async function seedSuperAdminIfNeeded(
  username: string,
  password: string,
): Promise<void> {
  const existing = await db.select().from(adminUsersTable).limit(1);
  if (existing.length > 0) return;
  const passwordHash = await hashPassword(password);
  await db.insert(adminUsersTable).values({
    username,
    passwordHash,
    role: "super_admin",
    displayName: "Super Admin",
  });
}

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username e password obbligatori" });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(503).json({
      error: "Admin password not configured. Set ADMIN_PASSWORD in Secrets.",
    });
    return;
  }

  await seedSuperAdminIfNeeded(process.env.ADMIN_USERNAME || "admin", adminPassword);

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Username o password non corretti" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Username o password non corretti" });
    return;
  }

  req.session.isAdmin = true;
  req.session.adminUserId = user.id;
  req.session.adminUsername = user.username;
  req.session.adminRole = user.role;

  res.json({ ok: true, role: user.role, username: user.username });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res) => {
  if (req.session.isAdmin) {
    res.json({
      isAdmin: true,
      role: req.session.adminRole,
      username: req.session.adminUsername,
      userId: req.session.adminUserId,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

export default router;
