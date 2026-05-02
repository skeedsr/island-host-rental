import { pgTable, serial, text, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  vvLicense: text("vv_license").notNull(),
  igicEnabled: boolean("igic_enabled").notNull().default(false),
  nightlyRate: real("nightly_rate").notNull().default(0),
  maxGuests: integer("max_guests").notNull().default(1),
  photos: text("photos").array().notNull().default([]),
  icalImportUrls: text("ical_import_urls").array().notNull().default([]),
  icalExportToken: text("ical_export_token").notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
