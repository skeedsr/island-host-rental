import { Router } from "express";
import { db, adminUsersTable, propertyAssignmentsTable, propertiesTable, customersTable } from "@workspace/db";
import { eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { requireSuperAdmin } from "../middlewares/auth";
import { hashPassword } from "../lib/password";
import type { AdminRole } from "@workspace/db";

const router = Router();

const CreateUserBody = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8),
  role: z.enum(["super_admin", "property_manager"]),
  displayName: z.string().max(128).optional(),
});

const UpdateUserBody = z.object({
  password: z.string().min(8).optional(),
  role: z.enum(["super_admin", "property_manager"]).optional(),
  displayName: z.string().max(128).optional(),
});

const AssignPropertyBody = z.object({
  adminUserId: z.number().int().positive().optional(),
  customerId: z.number().int().positive().optional(),
  propertyId: z.number().int().positive(),
});

function safeUser(u: typeof adminUsersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    displayName: u.displayName,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

// ── Admin users (system accounts) ──────────────────────────────────

router.get("/admin/users", requireSuperAdmin, async (_req, res) => {
  const users = await db
    .select()
    .from(adminUsersTable)
    .orderBy(adminUsersTable.createdAt);
  res.json(users.map(safeUser));
});

router.post("/admin/users", requireSuperAdmin, async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { username, password, role, displayName } = parsed.data;

  const existing = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username));

  if (existing.length > 0) {
    res.status(409).json({ error: "Username già in uso" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(adminUsersTable)
    .values({ username, passwordHash, role, displayName })
    .returning();

  res.status(201).json(safeUser(user));
});

router.get("/admin/users/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, id));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const assignments = await db
    .select({
      id: propertyAssignmentsTable.id,
      propertyId: propertyAssignmentsTable.propertyId,
      propertyName: propertiesTable.name,
      propertyLocation: propertiesTable.location,
    })
    .from(propertyAssignmentsTable)
    .innerJoin(propertiesTable, eq(propertyAssignmentsTable.propertyId, propertiesTable.id))
    .where(eq(propertyAssignmentsTable.adminUserId, id));

  res.json({ ...safeUser(user), assignments });
});

router.put("/admin/users/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.displayName !== undefined) updateData.displayName = parsed.data.displayName;
  if (parsed.data.password !== undefined) {
    updateData.passwordHash = await hashPassword(parsed.data.password);
  }

  const [updated] = await db
    .update(adminUsersTable)
    .set(updateData)
    .where(eq(adminUsersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  res.json(safeUser(updated));
});

router.delete("/admin/users/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(adminUsersTable)
    .where(eq(adminUsersTable.id, id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }

  res.status(204).send();
});

// ── Customers list & admin-role management ──────────────────────────

router.get("/admin/customers", requireSuperAdmin, async (_req, res) => {
  const customers = await db
    .select({
      id: customersTable.id,
      email: customersTable.email,
      firstName: customersTable.firstName,
      lastName: customersTable.lastName,
      phone: customersTable.phone,
      adminRole: customersTable.adminRole,
      createdAt: customersTable.createdAt,
    })
    .from(customersTable)
    .orderBy(customersTable.createdAt);
  res.json(customers);
});

const SetAdminRoleBody = z.object({
  role: z.enum(["property_manager", "super_admin"]).nullable(),
});

router.put("/admin/customers/:id/admin-role", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = SetAdminRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [updated] = await db
    .update(customersTable)
    .set({ adminRole: parsed.data.role as AdminRole | null })
    .where(eq(customersTable.id, id))
    .returning({
      id: customersTable.id,
      email: customersTable.email,
      firstName: customersTable.firstName,
      lastName: customersTable.lastName,
      adminRole: customersTable.adminRole,
    });

  if (!updated) { res.status(404).json({ error: "Cliente non trovato" }); return; }

  res.json(updated);
});

// ── Customer property assignments ───────────────────────────────────

router.get("/admin/customers/:id/assignments", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [customer] = await db
    .select({ id: customersTable.id, firstName: customersTable.firstName, lastName: customersTable.lastName, adminRole: customersTable.adminRole })
    .from(customersTable)
    .where(eq(customersTable.id, id));

  if (!customer) { res.status(404).json({ error: "Cliente non trovato" }); return; }

  const assignments = await db
    .select({
      id: propertyAssignmentsTable.id,
      propertyId: propertyAssignmentsTable.propertyId,
      propertyName: propertiesTable.name,
      propertyLocation: propertiesTable.location,
    })
    .from(propertyAssignmentsTable)
    .innerJoin(propertiesTable, eq(propertyAssignmentsTable.propertyId, propertiesTable.id))
    .where(eq(propertyAssignmentsTable.customerId, id));

  res.json({ ...customer, assignments });
});

const CustomerAssignBody = z.object({
  propertyId: z.number().int().positive(),
});

router.post("/admin/customers/:id/assignments", requireSuperAdmin, async (req, res) => {
  const customerId = Number(req.params.id);
  if (!customerId) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = CustomerAssignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [customer] = await db
    .select({ id: customersTable.id, adminRole: customersTable.adminRole })
    .from(customersTable)
    .where(eq(customersTable.id, customerId));

  if (!customer) { res.status(404).json({ error: "Cliente non trovato" }); return; }
  if (!customer.adminRole) {
    res.status(400).json({ error: "Il cliente non ha un ruolo host abilitato" });
    return;
  }

  try {
    const [assignment] = await db
      .insert(propertyAssignmentsTable)
      .values({ customerId, propertyId: parsed.data.propertyId })
      .returning();
    res.status(201).json(assignment);
  } catch {
    res.status(409).json({ error: "Assegnazione già esistente" });
  }
});

// ── Property assignments (shared endpoint for admin_users) ──────────

router.get("/admin/property-assignments", requireSuperAdmin, async (_req, res) => {
  const assignments = await db
    .select({
      id: propertyAssignmentsTable.id,
      adminUserId: propertyAssignmentsTable.adminUserId,
      customerId: propertyAssignmentsTable.customerId,
      propertyId: propertyAssignmentsTable.propertyId,
      createdAt: propertyAssignmentsTable.createdAt,
      propertyName: propertiesTable.name,
      propertyLocation: propertiesTable.location,
    })
    .from(propertyAssignmentsTable)
    .innerJoin(propertiesTable, eq(propertyAssignmentsTable.propertyId, propertiesTable.id));

  res.json(assignments);
});

router.post("/admin/property-assignments", requireSuperAdmin, async (req, res) => {
  const parsed = AssignPropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { adminUserId, propertyId } = parsed.data;

  if (!adminUserId) {
    res.status(400).json({ error: "adminUserId richiesto per questo endpoint" });
    return;
  }

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, adminUserId));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.role !== "property_manager") {
    res.status(400).json({ error: "Solo i property_manager possono avere assegnazioni" });
    return;
  }

  try {
    const [assignment] = await db
      .insert(propertyAssignmentsTable)
      .values({ adminUserId, propertyId })
      .returning();
    res.status(201).json(assignment);
  } catch {
    res.status(409).json({ error: "Assegnazione già esistente" });
  }
});

router.delete("/admin/property-assignments/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(propertyAssignmentsTable)
    .where(eq(propertyAssignmentsTable.id, id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Assignment not found" }); return; }

  res.status(204).send();
});

export default router;
