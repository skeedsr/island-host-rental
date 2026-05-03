import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const propertyAssignmentsTable = pgTable(
  "property_assignments",
  {
    id: serial("id").primaryKey(),
    adminUserId: integer("admin_user_id").notNull(),
    propertyId: integer("property_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique("uq_pm_property").on(table.adminUserId, table.propertyId)],
);

export type PropertyAssignment = typeof propertyAssignmentsTable.$inferSelect;
