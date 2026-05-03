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
  if (!req.session.adminUserId) return false;
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

export async function getAssignedPropertyIds(
  req: Parameters<RequestHandler>[0],
): Promise<number[] | null> {
  if (!req.session?.isAdmin) return null;
  if (req.session.adminRole === "super_admin") return null;
  if (!req.session.adminUserId) return [];
  const assignments = await db
    .select({ propertyId: propertyAssignmentsTable.propertyId })
    .from(propertyAssignmentsTable)
    .where(eq(propertyAssignmentsTable.adminUserId, req.session.adminUserId));
  return assignments.map((a) => a.propertyId);
}
