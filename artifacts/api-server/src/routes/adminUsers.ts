import { Router } from "express";
import { db, adminUsersTable, propertyAssignmentsTable, propertiesTable, customersTable } from "@workspace/db";
import { eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { requireSuperAdmin } from "../middlewares/auth";
import { hashPassword } from "../lib/password";

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
  linkedCustomerId: z.number().int().positive().nullable().optional(),
});

const AssignPropertyBody = z.object({
  adminUserId: z.number().int().positive(),
  propertyId: z.number().int().positive(),
});

function safeUser(u: typeof adminUsersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    displayName: u.displayName,
    linkedCustomerId: u.linkedCustomerId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

router.get("/admin/users", requireSuperAdmin, async (_req, res) => {
  const users = await db
    .select()
    .from(adminUsersTable)
    .orderBy(adminUsersTable.createdAt);
  res.json(users.map(safeUser));
});

router.get("/admin/customers", requireSuperAdmin, async (_req, res) => {
  const customers = await db
    .select({
      id: customersTable.id,
      email: customersTable.email,
      firstName: customersTable.firstName,
      lastName: customersTable.lastName,
      phone: customersTable.phone,
      createdAt: customersTable.createdAt,
    })
    .from(customersTable)
    .orderBy(customersTable.createdAt);
  res.json(customers);
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
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const assignments = await db
    .select({
      id: propertyAssignmentsTable.id,
      propertyId: propertyAssignmentsTable.propertyId,
      propertyName: propertiesTable.name,
      propertyLocation: propertiesTable.location,
    })
    .from(propertyAssignmentsTable)
    .innerJoin(
      propertiesTable,
      eq(propertyAssignmentsTable.propertyId, propertiesTable.id),
    )
    .where(eq(propertyAssignmentsTable.adminUserId, id));

  let linkedCustomer: { id: number; firstName: string; lastName: string; email: string } | null = null;
  if (user.linkedCustomerId) {
    const [customer] = await db
      .select({
        id: customersTable.id,
        firstName: customersTable.firstName,
        lastName: customersTable.lastName,
        email: customersTable.email,
      })
      .from(customersTable)
      .where(eq(customersTable.id, user.linkedCustomerId));
    linkedCustomer = customer ?? null;
  }

  res.json({ ...safeUser(user), assignments, linkedCustomer });
});

router.put("/admin/users/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.displayName !== undefined)
    updateData.displayName = parsed.data.displayName;
  if (parsed.data.password !== undefined) {
    updateData.passwordHash = await hashPassword(parsed.data.password);
  }

  if ("linkedCustomerId" in parsed.data) {
    const newLinkedId = parsed.data.linkedCustomerId;

    if (newLinkedId !== null && newLinkedId !== undefined) {
      const [customer] = await db
        .select({ id: customersTable.id })
        .from(customersTable)
        .where(eq(customersTable.id, newLinkedId));
      if (!customer) {
        res.status(404).json({ error: "Cliente non trovato" });
        return;
      }

      const [alreadyLinked] = await db
        .select({ id: adminUsersTable.id })
        .from(adminUsersTable)
        .where(eq(adminUsersTable.linkedCustomerId, newLinkedId));
      if (alreadyLinked && alreadyLinked.id !== id) {
        res.status(409).json({
          error: "Questo cliente è già collegato a un altro utente amministratore",
        });
        return;
      }
    }

    updateData.linkedCustomerId = newLinkedId ?? null;
  }

  const [updated] = await db
    .update(adminUsersTable)
    .set(updateData)
    .where(eq(adminUsersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(safeUser(updated));
});

router.delete("/admin/users/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(adminUsersTable)
    .where(eq(adminUsersTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(204).send();
});

router.get("/admin/property-assignments", requireSuperAdmin, async (_req, res) => {
  const assignments = await db
    .select({
      id: propertyAssignmentsTable.id,
      adminUserId: propertyAssignmentsTable.adminUserId,
      propertyId: propertyAssignmentsTable.propertyId,
      createdAt: propertyAssignmentsTable.createdAt,
      username: adminUsersTable.username,
      displayName: adminUsersTable.displayName,
      role: adminUsersTable.role,
      propertyName: propertiesTable.name,
      propertyLocation: propertiesTable.location,
    })
    .from(propertyAssignmentsTable)
    .innerJoin(
      adminUsersTable,
      eq(propertyAssignmentsTable.adminUserId, adminUsersTable.id),
    )
    .innerJoin(
      propertiesTable,
      eq(propertyAssignmentsTable.propertyId, propertiesTable.id),
    );

  res.json(assignments);
});

router.post("/admin/property-assignments", requireSuperAdmin, async (req, res) => {
  const parsed = AssignPropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { adminUserId, propertyId } = parsed.data;

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, adminUserId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role !== "property_manager") {
    res
      .status(400)
      .json({ error: "Solo i property_manager possono avere assegnazioni" });
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
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(propertyAssignmentsTable)
    .where(eq(propertyAssignmentsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.status(204).send();
});

export default router;
