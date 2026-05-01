import { useState } from "react";
import { Link } from "wouter";
import { useListBookings, useListProperties } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";

const SOURCE_COLORS: Record<string, string> = {
  Direct: "bg-blue-500",
  Airbnb: "bg-red-500",
  "Booking.com": "bg-teal-500",
  VRBO: "bg-amber-500",
  Other: "bg-gray-400",
};

const SOURCE_LIGHT: Record<string, string> = {
  Direct: "bg-blue-100 text-blue-800",
  Airbnb: "bg-red-100 text-red-800",
  "Booking.com": "bg-teal-100 text-teal-800",
  VRBO: "bg-amber-100 text-amber-800",
  Other: "bg-gray-100 text-gray-700",
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  const { data: bookings, isLoading: loadingBookings } = useListBookings();
  const { data: properties, isLoading: loadingProperties } = useListProperties();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const filteredBookings = (bookings ?? []).filter((b) => {
    if (b.status === "cancelled") return false;
    if (selectedPropertyId !== null && b.propertyId !== selectedPropertyId) return false;
    return true;
  });

  const bookingsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return filteredBookings.filter(
      (b) => b.startDate <= dateStr && b.endDate > dateStr
    );
  };

  const propertyName = (id: number) =>
    properties?.find((p) => p.id === id)?.name ?? `Property #${id}`;

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Multi-property booking overview.</p>
        </div>
        <Link href="/bookings">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Manage Bookings
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground font-medium">Filter:</span>
        <Button
          variant={selectedPropertyId === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPropertyId(null)}
          data-testid="button-filter-all"
        >
          All Properties
        </Button>
        {(properties ?? []).map((p) => (
          <Button
            key={p.id}
            variant={selectedPropertyId === p.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPropertyId(p.id)}
            data-testid={`button-filter-property-${p.id}`}
          >
            {p.name}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                data-testid="button-today"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBookings || loadingProperties ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-semibold text-muted-foreground py-2"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
                {days.map((day) => {
                  const dayBookings = bookingsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, today);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[80px] rounded-md border p-1 transition-colors ${
                        isCurrentMonth
                          ? "bg-card border-border"
                          : "bg-muted/30 border-border/40"
                      } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
                      data-testid={`day-${format(day, "yyyy-MM-dd")}`}
                    >
                      <div
                        className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5">
                        {dayBookings.slice(0, 3).map((b) => (
                          <Link
                            key={`${b.id}-${day.toISOString()}`}
                            href={`/bookings/${b.id}`}
                          >
                            <div
                              className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity text-white font-medium ${
                                SOURCE_COLORS[b.source] ?? SOURCE_COLORS.Other
                              }`}
                              title={`${b.guestName} — ${propertyName(b.propertyId)}`}
                              data-testid={`booking-chip-${b.id}`}
                            >
                              {b.guestName.split(" ")[0]}
                            </div>
                          </Link>
                        ))}
                        {dayBookings.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <span className="text-sm text-muted-foreground font-medium self-center">Source key:</span>
        {Object.entries(SOURCE_LIGHT).map(([source, cls]) => (
          <span
            key={source}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cls}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${SOURCE_COLORS[source]}`}
            />
            {source}
          </span>
        ))}
      </div>
    </div>
  );
}
