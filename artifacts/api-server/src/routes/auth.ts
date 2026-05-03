import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, adminUsersTable, customersTable } from "@workspace/db";
import { and, eq, isNotNull } from "drizzle-orm";
import type { AdminRole } from "@workspace/db";
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

  // 1. Try username-based login against admin_users (existing system accounts)
  const [adminUser] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username));

  if (adminUser) {
    const valid = await verifyPassword(password, adminUser.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Username o password non corretti" });
      return;
    }
    req.session.isAdmin = true;
    req.session.adminUserId = adminUser.id;
    req.session.adminUsername = adminUser.username;
    req.session.adminRole = adminUser.role;
    res.json({ ok: true, role: adminUser.role, username: adminUser.username });
    return;
  }

  // 2. Try email-based login against customers with admin_role set
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.email, username.toLowerCase()),
        isNotNull(customersTable.adminRole),
      ),
    );

  if (customer && customer.adminRole) {
    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Username o password non corretti" });
      return;
    }
    req.session.isAdmin = true;
    req.session.customerId = customer.id;
    req.session.adminUsername = customer.email;
    req.session.adminRole = customer.adminRole as AdminRole;
    res.json({ ok: true, role: customer.adminRole, username: customer.email });
    return;
  }

  res.status(401).json({ error: "Username o password non corretti" });
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
      customerId: req.session.customerId,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

export default router;
