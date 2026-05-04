import { Router } from "express";
import {
  db,
  bookingsTable,
  propertiesTable,
  propertyAssignmentsTable,
  adminUsersTable,
  customersTable,
} from "@workspace/db";
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
import { sendBookingEmailToHost } from "../lib/mailer";

const router = Router();

const IGIC_RATE = 0.07;

function calcIgic(total: number | null | undefined, enabled: boolean): number | null {
  if (!enabled || !total) return null;
  return Math.round(total * IGIC_RATE * 100) / 100;
}

// =======================
// GET BOOKINGS
// =======================
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

// =======================
// CREATE BOOKING
// =======================
router.post("/bookings", requireUser, async (req, res) => {
  console.log("🔥 POST /bookings chiamato");
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  // 🔹 Get property
  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, data.propertyId));

  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  // 🔹 Find host assignment
  const [assignment] = await db
    .select()
    .from(propertyAssignmentsTable)
    .where(eq(propertyAssignmentsTable.propertyId, data.propertyId));

  let hostEmail: string | null = null;

  // 🔹 Caso 1: host via admin_user_id
  if (assignment?.adminUserId) {
    const [host] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, assignment.adminUserId));

    // TEMP: username usato come email
    hostEmail = host?.username ?? null;
  }

  // 🔹 Caso 2: fallback via customer_id
  if (!hostEmail && assignment?.customerId) {
    const [customerHost] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, assignment.customerId));

    hostEmail = customerHost?.email ?? null;
  }

  // 🔹 Check overlapping bookings
  const overlapping = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.propertyId, data.propertyId),
        ne(bookingsTable.status, "cancelled"),
        ne(bookingsTable.status, "rejected"),
        ne(bookingsTable.status, "pending"),
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

  // 🔹 Status logic
  const status = req.session?.isAdmin ? (data.status ?? "pending") : "pending";

  const igicAmount = calcIgic(data.totalPrice, property.igicEnabled);

  // 🔹 Create booking
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
      status,
      rentalType: data.rentalType,
      totalPrice: data.totalPrice,
      igicAmount,
      notes: data.notes,
    })
    .returning();

  // =======================
  // 📧 EMAIL SIMULATION
  // =======================
  if (hostEmail) {
    await sendBookingEmailToHost({
      to: hostEmail,
      property: property.name,
      guest: booking.guestName,
      email: booking.guestEmail,
      phone: booking.guestPhone,
      dates: `${booking.startDate} - ${booking.endDate}`,
      total: booking.totalPrice,
    });
  } else {
    return res.status(500).json({
      error: "Host non trovato o senza email",
      assignment,
    });
  }

  res.status(201).json(booking);
});

// =======================
// GET SINGLE BOOKING
// =======================
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

// =======================
// UPDATE BOOKING
// =======================
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

// =======================
// DELETE BOOKING
// =======================
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