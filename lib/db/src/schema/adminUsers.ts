import { pgTable, serial, text, timestamp, integer, unique } from "drizzle-orm/pg-core";

export const adminRoles = ["super_admin", "property_manager"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminUsersTable = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().$type<AdminRole>(),
    displayName: text("display_name"),
    linkedCustomerId: integer("linked_customer_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_admin_linked_customer").on(table.linkedCustomerId),
  ],
);

export type AdminUser = typeof adminUsersTable.$inferSelect;
