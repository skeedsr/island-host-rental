import { Router } from "express";
import crypto from "crypto";
import { db, propertiesTable, bookingsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  CreatePropertyBody,
  UpdatePropertyBody,
  GetPropertyParams,
  UpdatePropertyParams,
  DeletePropertyParams,
  SyncPropertyIcalParams,
  ExportPropertyIcalParams,
  ExportPropertyIcalQueryParams,
} from "@workspace/api-zod";
import { syncICalFeed, generateICalFeed } from "../lib/ical";
import {
  requireAdmin,
  requireSuperAdmin,
  canAccessProperty,
  getAssignedPropertyIds,
} from "../middlewares/auth";

const router = Router();

function mapProperty(p: typeof propertiesTable.$inferSelect) {
  return {
    ...p,
    photos: p.photos ?? [],
    icalImportUrls: p.icalImportUrls ?? [],
    nightly_rate: p.nightlyRate,
    max_guests: p.maxGuests,
  };
}

router.get("/properties", async (req, res) => {
  const assignedIds = await getAssignedPropertyIds(req);

  let properties;
  if (assignedIds === null) {
    properties = await db
      .select()
      .from(propertiesTable)
      .orderBy(propertiesTable.createdAt);
  } else if (assignedIds.length === 0) {
    properties = [];
  } else {
    properties = await db
      .select()
      .from(propertiesTable)
      .where(inArray(propertiesTable.id, assignedIds))
      .orderBy(propertiesTable.createdAt);
  }

  res.json(properties.map(mapProperty));
});

router.post("/properties", requireSuperAdmin, async (req, res) => {
  const parsed = CreatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const token = crypto.randomBytes(32).toString("hex");

  const [property] = await db
    .insert(propertiesTable)
    .values({
      name: data.name,
      location: data.location,
      description: data.description,
      vvLicense: data.vvLicense,
      igicEnabled: data.igicEnabled,
      nightlyRate: data.nightly_rate ?? 0,
      maxGuests: data.max_guests ?? 1,
      photos: data.photos ?? [],
      icalImportUrls: data.icalImportUrls ?? [],
      icalExportToken: token,
    })
    .returning();

  res.status(201).json(mapProperty(property));
});

router.get("/properties/:id", async (req, res) => {
  const parsed = GetPropertyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, parsed.data.id));

  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  res.json(mapProperty(property));
});

router.put("/properties/:id", requireAdmin, async (req, res) => {
  const paramsParsed = UpdatePropertyParams.safeParse({
    id: Number(req.params.id),
  });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const propertyId = paramsParsed.data.id;

  const hasAccess = await canAccessProperty(req, propertyId);
  if (!hasAccess) {
    res.status(403).json({ error: "Access denied to this property" });
    return;
  }

  const bodyParsed = UpdatePropertyBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.flatten() });
    return;
  }

  const data = bodyParsed.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.vvLicense !== undefined) updateData.vvLicense = data.vvLicense;
  if (data.igicEnabled !== undefined) updateData.igicEnabled = data.igicEnabled;
  if (data.nightly_rate !== undefined) updateData.nightlyRate = data.nightly_rate;
  if (data.max_guests !== undefined) updateData.maxGuests = data.max_guests;
  if (data.photos !== undefined) updateData.photos = data.photos;
  if (data.icalImportUrls !== undefined)
    updateData.icalImportUrls = data.icalImportUrls;

  const [updated] = await db
    .update(propertiesTable)
    .set(updateData)
    .where(eq(propertiesTable.id, propertyId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  res.json(mapProperty(updated));
});

router.delete("/properties/:id", requireSuperAdmin, async (req, res) => {
  const parsed = DeletePropertyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db
    .delete(propertiesTable)
    .where(eq(propertiesTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/properties/:id/sync", requireAdmin, async (req, res) => {
  const parsed = SyncPropertyIcalParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const hasAccess = await canAccessProperty(req, parsed.data.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Access denied to this property" });
    return;
  }

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, parsed.data.id));

  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const importUrls = property.icalImportUrls ?? [];
  let totalSynced = 0;
  let totalConflicts = 0;
  const allErrors: string[] = [];

  for (const url of importUrls) {
    const result = await syncICalFeed(property.id, url);
    totalSynced += result.synced;
    totalConflicts += result.conflicts;
    allErrors.push(...result.errors);
  }

  const lastSyncAt = new Date();
  await db
    .update(propertiesTable)
    .set({
      lastSyncAt,
      syncStatus: allErrors.length > 0 ? "partial" : "ok",
      updatedAt: lastSyncAt,
    })
    .where(eq(propertiesTable.id, property.id));

  res.json({
    synced: totalSynced,
    conflicts: totalConflicts,
    errors: allErrors,
    lastSyncAt: lastSyncAt.toISOString(),
  });
});

router.get("/properties/:id/ical-export", async (req, res) => {
  const paramsParsed = ExportPropertyIcalParams.safeParse({
    id: Number(req.params.id),
  });
  const queryParsed = ExportPropertyIcalQueryParams.safeParse({
    token: req.query.token,
  });

  if (!paramsParsed.success || !queryParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, paramsParsed.data.id));

  if (!property || property.icalExportToken !== queryParsed.data.token) {
    res.status(403).json({ error: "Invalid token" });
    return;
  }

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.propertyId, property.id));

  const ical = generateICalFeed(property.name, bookings);

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${property.name}.ics"`,
  );
  res.send(ical);
});

export default router;
