import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const propertyAssignmentsTable = pgTable(
  "property_assignments",
  {
    id: serial("id").primaryKey(),
    adminUserId: integer("admin_user_id"),
    customerId: integer("customer_id"),
    propertyId: integer("property_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
);

export type PropertyAssignment = typeof propertyAssignmentsTable.$inferSelect;
