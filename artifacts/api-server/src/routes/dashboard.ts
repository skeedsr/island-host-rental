import { Router } from "express";
import { db, propertiesTable, bookingsTable } from "@workspace/db";
import { eq, and, gte, lte, not, inArray } from "drizzle-orm";
import { requireAdmin, getAssignedPropertyIds } from "../middlewares/auth";

const router = Router();

router.use(requireAdmin);

router.get("/dashboard/summary", async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  const today = now.toISOString().split("T")[0];
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const assignedIds = await getAssignedPropertyIds(req);

  const properties =
    assignedIds === null
      ? await db.select().from(propertiesTable)
      : assignedIds.length === 0
        ? []
        : await db
            .select()
            .from(propertiesTable)
            .where(inArray(propertiesTable.id, assignedIds));

  const propertyIds = properties.map((p) => p.id);

  const allBookings =
    propertyIds.length === 0
      ? []
      : assignedIds === null
        ? await db.select().from(bookingsTable)
        : await db
            .select()
            .from(bookingsTable)
            .where(inArray(bookingsTable.propertyId, propertyIds));

  const totalProperties = properties.length;
  const totalBookings = allBookings.length;

  const activeBookings = allBookings.filter(
    (b) =>
      b.status !== "cancelled" &&
      b.startDate <= today &&
      b.endDate >= today,
  ).length;

  const thisMonthBookings = allBookings.filter(
    (b) =>
      b.status !== "cancelled" &&
      b.startDate <= monthEnd &&
      b.endDate >= monthStart,
  );

  let occupiedDays = 0;
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const totalPropertyDays = totalProperties * daysInMonth;

  for (const booking of thisMonthBookings) {
    const start = new Date(
      Math.max(
        new Date(booking.startDate).getTime(),
        new Date(monthStart).getTime(),
      ),
    );
    const end = new Date(
      Math.min(
        new Date(booking.endDate).getTime(),
        new Date(monthEnd).getTime(),
      ),
    );
    const days = Math.max(
      0,
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    occupiedDays += days;
  }

  const occupancyRate =
    totalPropertyDays > 0
      ? Math.round((occupiedDays / totalPropertyDays) * 100)
      : 0;

  const revenueThisMonth = thisMonthBookings.reduce(
    (sum, b) => sum + (b.totalPrice ?? 0),
    0,
  );

  const pendingCheckins = allBookings.filter(
    (b) =>
      b.status === "confirmed" &&
      b.startDate >= today &&
      b.startDate <= next30,
  ).length;

  res.json({
    totalProperties,
    totalBookings,
    activeBookings,
    occupancyRate,
    revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
    pendingCheckins,
  });
});

router.get("/dashboard/upcoming", async (req, res) => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const assignedIds = await getAssignedPropertyIds(req);

  let query = db
    .select({
      id: bookingsTable.id,
      propertyId: bookingsTable.propertyId,
      propertyName: propertiesTable.name,
      propertyLocation: propertiesTable.location,
      guestName: bookingsTable.guestName,
      guestEmail: bookingsTable.guestEmail,
      startDate: bookingsTable.startDate,
      endDate: bookingsTable.endDate,
      source: bookingsTable.source,
      status: bookingsTable.status,
      totalPrice: bookingsTable.totalPrice,
    })
    .from(bookingsTable)
    .innerJoin(propertiesTable, eq(bookingsTable.propertyId, propertiesTable.id))
    .$dynamic();

  const conditions = [
    not(eq(bookingsTable.status, "cancelled")),
    gte(bookingsTable.startDate, today),
    lte(bookingsTable.startDate, next30),
  ];

  if (assignedIds !== null && assignedIds.length > 0) {
    conditions.push(inArray(bookingsTable.propertyId, assignedIds));
  }

  if (assignedIds !== null && assignedIds.length === 0) {
    res.json([]);
    return;
  }

  const bookings = await query
    .where(and(...conditions))
    .orderBy(bookingsTable.startDate);

  res.json(bookings);
});

router.get("/dashboard/occupancy", async (req, res) => {
  const assignedIds = await getAssignedPropertyIds(req);

  const allBookings =
    assignedIds === null
      ? await db.select().from(bookingsTable)
      : assignedIds.length === 0
        ? []
        : await db
            .select()
            .from(bookingsTable)
            .where(inArray(bookingsTable.propertyId, assignedIds));

  const properties =
    assignedIds === null
      ? await db.select().from(propertiesTable)
      : assignedIds.length === 0
        ? []
        : await db
            .select()
            .from(propertiesTable)
            .where(inArray(propertiesTable.id, assignedIds));

  const totalProperties = properties.length;
  const months: { month: string; occupancyRate: number; bookings: number }[] =
    [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStart = new Date(year, month, 1).toISOString().split("T")[0];
    const monthEnd = new Date(year, month + 1, 0).toISOString().split("T")[0];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthBookings = allBookings.filter(
      (b) =>
        b.status !== "cancelled" &&
        b.startDate <= monthEnd &&
        b.endDate >= monthStart,
    );

    let occupiedDays = 0;
    for (const booking of monthBookings) {
      const start = new Date(
        Math.max(
          new Date(booking.startDate).getTime(),
          new Date(monthStart).getTime(),
        ),
      );
      const end = new Date(
        Math.min(
          new Date(booking.endDate).getTime(),
          new Date(monthEnd).getTime(),
        ),
      );
      const days = Math.max(
        0,
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      occupiedDays += days;
    }

    const totalDays = totalProperties * daysInMonth;
    const occupancyRate =
      totalDays > 0 ? Math.round((occupiedDays / totalDays) * 100) : 0;

    months.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      occupancyRate,
      bookings: monthBookings.length,
    });
  }

  res.json(months);
});

router.get("/dashboard/revenue", async (req, res) => {
  const assignedIds = await getAssignedPropertyIds(req);

  const bookings =
    assignedIds === null
      ? await db
          .select()
          .from(bookingsTable)
          .where(not(eq(bookingsTable.status, "cancelled")))
      : assignedIds.length === 0
        ? []
        : await db
            .select()
            .from(bookingsTable)
            .where(
              and(
                not(eq(bookingsTable.status, "cancelled")),
                inArray(bookingsTable.propertyId, assignedIds),
              ),
            );

  const sourceMap = new Map<string, { revenue: number; bookings: number }>();

  for (const booking of bookings) {
    const source = booking.source ?? "Other";
    const existing = sourceMap.get(source) ?? { revenue: 0, bookings: 0 };
    existing.revenue += booking.totalPrice ?? 0;
    existing.bookings += 1;
    sourceMap.set(source, existing);
  }

  const result = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    revenue: Math.round(data.revenue * 100) / 100,
    bookings: data.bookings,
  }));

  res.json(result);
});

export default router;
