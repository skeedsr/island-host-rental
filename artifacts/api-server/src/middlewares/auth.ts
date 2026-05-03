import type { RequestHandler } from "express";
import { db, propertyAssignmentsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.session?.isAdmin) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (!req.session?.isAdmin) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.session.adminRole !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
};

export const requireUser: RequestHandler = (_req, _res, next) => {
  next();
};

export async function canAccessProperty(
  req: Parameters<RequestHandler>[0],
  propertyId: number,
): Promise<boolean> {
  if (!req.session?.isAdmin) return false;
  if (req.session.adminRole === "super_admin") return true;

  // System admin account (admin_users-based session)
  if (req.session.adminUserId) {
    const [assignment] = await db
      .select()
      .from(propertyAssignmentsTable)
      .where(
        and(
          eq(propertyAssignmentsTable.adminUserId, req.session.adminUserId),
          eq(propertyAssignmentsTable.propertyId, propertyId),
        ),
      );
    return !!assignment;
  }

  // Customer-based admin session (customer with adminRole)
  if (req.session.customerId) {
    const [assignment] = await db
      .select()
      .from(propertyAssignmentsTable)
      .where(
        and(
          eq(propertyAssignmentsTable.customerId, req.session.customerId),
          eq(propertyAssignmentsTable.propertyId, propertyId),
        ),
      );
    return !!assignment;
  }

  return false;
}

export async function getAssignedPropertyIds(
  req: Parameters<RequestHandler>[0],
): Promise<number[] | null> {
  if (!req.session?.isAdmin) return null;
  if (req.session.adminRole === "super_admin") return null;

  // System admin account
  if (req.session.adminUserId) {
    const assignments = await db
      .select({ propertyId: propertyAssignmentsTable.propertyId })
      .from(propertyAssignmentsTable)
      .where(eq(propertyAssignmentsTable.adminUserId, req.session.adminUserId));
    return assignments.map((a) => a.propertyId);
  }

  // Customer-based admin session
  if (req.session.customerId) {
    const assignments = await db
      .select({ propertyId: propertyAssignmentsTable.propertyId })
      .from(propertyAssignmentsTable)
      .where(eq(propertyAssignmentsTable.customerId, req.session.customerId));
    return assignments.map((a) => a.propertyId);
  }

  return [];
}
