import { Router } from "express";
import { db, bookingsTable, propertiesTable } from "@workspace/db";
import { eq, and, lt, gt, ne } from "drizzle-orm";
import {
  CreateBookingBody,
  UpdateBookingBody,
  GetBookingParams,
  UpdateBookingParams,
  DeleteBookingParams,
  ListBookingsQueryParams,
} from "@workspace/api-zod";
import { requireAdmin, requireUser } from "../middlewares/auth";

const router = Router();

const IGIC_RATE = 0.07;

function calcIgic(total: number | null | undefined, enabled: boolean): number | null {
  if (!enabled || !total) return null;
  return Math.round(total * IGIC_RATE * 100) / 100;
}

router.get("/bookings", async (req, res) => {
  const parsed = ListBookingsQueryParams.safeParse({
    propertyId: req.query.propertyId ? Number(req.query.propertyId) : undefined,
    status: req.query.status,
  });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const conditions = [];
  if (parsed.data.propertyId !== undefined) {
    conditions.push(eq(bookingsTable.propertyId, parsed.data.propertyId));
  }
  if (parsed.data.status !== undefined) {
    conditions.push(eq(bookingsTable.status, parsed.data.status));
  }

  const bookings =
    conditions.length > 0
      ? await db
          .select()
          .from(bookingsTable)
          .where(and(...conditions))
          .orderBy(bookingsTable.startDate)
      : await db.select().from(bookingsTable).orderBy(bookingsTable.startDate);

  res.json(bookings);
});

router.post("/bookings", requireUser, async (req, res) => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, data.propertyId));

  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  // Check for overlapping bookings (exclude cancelled)
  const overlapping = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.propertyId, data.propertyId),
        ne(bookingsTable.status, "cancelled"),
        lt(bookingsTable.startDate, data.endDate),
        gt(bookingsTable.endDate, data.startDate),
      ),
    );

  if (overlapping.length > 0) {
    res.status(409).json({
      error: "Le date selezionate non sono disponibili. Scegli date diverse.",
    });
    return;
  }

  const igicAmount = calcIgic(data.totalPrice, property.igicEnabled);

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      propertyId: data.propertyId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      startDate: data.startDate,
      endDate: data.endDate,
      source: data.source,
      status: data.status,
      totalPrice: data.totalPrice,
      igicAmount,
      notes: data.notes,
    })
    .returning();

  res.status(201).json(booking);
});

router.get("/bookings/:id", requireAdmin, async (req, res) => {
  const parsed = GetBookingParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, parsed.data.id));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(booking);
});

router.put("/bookings/:id", requireAdmin, async (req, res) => {
  const paramsParsed = UpdateBookingParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const bodyParsed = UpdateBookingBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.flatten() });
    return;
  }

  const data = bodyParsed.data;

  const [existing] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, paramsParsed.data.id));

  if (!existing) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.guestName !== undefined) updateData.guestName = data.guestName;
  if (data.guestEmail !== undefined) updateData.guestEmail = data.guestEmail;
  if (data.guestPhone !== undefined) updateData.guestPhone = data.guestPhone;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.source !== undefined) updateData.source = data.source;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (data.totalPrice !== undefined) {
    updateData.totalPrice = data.totalPrice;
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, existing.propertyId));
    if (property) {
      updateData.igicAmount = calcIgic(data.totalPrice, property.igicEnabled);
    }
  }

  const [updated] = await db
    .update(bookingsTable)
    .set(updateData)
    .where(eq(bookingsTable.id, paramsParsed.data.id))
    .returning();

  res.json(updated);
});

router.delete("/bookings/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteBookingParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(bookingsTable).where(eq(bookingsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
