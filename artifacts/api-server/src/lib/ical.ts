import { db, bookingsTable } from "@workspace/db";
import { eq, and, not } from "drizzle-orm";

interface ICalEvent {
  uid: string;
  summary: string;
  dtStart: string;
  dtEnd: string;
  status?: string;
}

function parseICalDate(value: string): string {
  const clean = value.trim();
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  if (clean.includes("T")) {
    const datePart = clean.slice(0, 8);
    return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  }
  return clean;
}

export function parseICalFeed(icsContent: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icsContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  let inEvent = false;
  let current: Partial<ICalEvent> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith(" ") || line.startsWith("\t")) {
      continue;
    }

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
      inEvent = false;
      if (current.uid && current.dtStart && current.dtEnd) {
        events.push(current as ICalEvent);
      }
      continue;
    }

    if (!inEvent) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).split(";")[0].toUpperCase();
    const value = line.slice(colonIndex + 1).trim();

    switch (key) {
      case "UID":
        current.uid = value;
        break;
      case "SUMMARY":
        current.summary = value;
        break;
      case "DTSTART":
        current.dtStart = parseICalDate(value);
        break;
      case "DTEND":
        current.dtEnd = parseICalDate(value);
        break;
      case "STATUS":
        current.status = value;
        break;
    }
  }

  return events;
}

export function generateICalFeed(
  propertyName: string,
  bookings: Array<{
    id: number;
    guestName: string;
    startDate: string;
    endDate: string;
    status: string;
    externalUid: string | null;
  }>
): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const eventLines = bookings
    .filter((b) => b.status !== "cancelled")
    .map((b) => {
      const dtStart = b.startDate.replace(/-/g, "");
      const dtEnd = b.endDate.replace(/-/g, "");
      const uid = b.externalUid || `booking-${b.id}@isla-rentals.app`;

      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${b.guestName}`,
        `STATUS:CONFIRMED`,
        `DTSTAMP:${now}Z`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Isla Rentals//Canary Islands Rental Manager//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${propertyName}`,
    eventLines,
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function syncICalFeed(
  propertyId: number,
  feedUrl: string
): Promise<{ synced: number; conflicts: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  let conflicts = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let icsContent: string;
    try {
      const response = await fetch(feedUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      icsContent = await response.text();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }

    const events = parseICalFeed(icsContent);

    for (const event of events) {
      const existingBookings = await db
        .select()
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.propertyId, propertyId),
            eq(bookingsTable.externalUid, event.uid)
          )
        );

      if (existingBookings.length > 0) {
        await db
          .update(bookingsTable)
          .set({
            startDate: event.dtStart,
            endDate: event.dtEnd,
            updatedAt: new Date(),
          })
          .where(eq(bookingsTable.id, existingBookings[0].id));
        synced++;
        continue;
      }

      const overlapping = await db
        .select()
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.propertyId, propertyId),
            not(eq(bookingsTable.status, "cancelled"))
          )
        );

      const hasConflict = overlapping.some((b) => {
        return b.startDate < event.dtEnd && b.endDate > event.dtStart;
      });

      if (hasConflict) {
        conflicts++;
        errors.push(
          `Conflict: event ${event.uid} (${event.dtStart} - ${event.dtEnd}) overlaps existing booking`
        );
        continue;
      }

      await db.insert(bookingsTable).values({
        propertyId,
        guestName: event.summary || "External Guest",
        guestEmail: "sync@external.cal",
        startDate: event.dtStart,
        endDate: event.dtEnd,
        source: detectSource(feedUrl),
        status: "confirmed",
        externalUid: event.uid,
      });
      synced++;
    }
  } catch (err) {
    errors.push(`Failed to fetch ${feedUrl}: ${String(err)}`);
  }

  return { synced, conflicts, errors };
}

function detectSource(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("airbnb")) return "Airbnb";
  if (lower.includes("booking")) return "Booking.com";
  if (lower.includes("vrbo") || lower.includes("homeaway")) return "VRBO";
  return "Other";
}
