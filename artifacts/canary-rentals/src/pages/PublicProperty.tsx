import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAuth, useClerk } from "@clerk/clerk-react";
import {
  useGetProperty,
  useListBookings,
  useCreateBooking,
  getListBookingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  MapPin,
  Users,
  Euro,
  Star,
  CheckCircle2,
  Calendar,
  Wifi,
  Waves,
  Car,
  Wind,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import {
  format,
  parseISO,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { toast } from "sonner";

const ISLAND_IMAGES: Record<string, string> = {
  Lanzarote: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85",
  Fuerteventura: "https://images.unsplash.com/photo-1548019979-afb56a792aab?w=1200&q=85",
  "Gran Canaria": "https://images.unsplash.com/photo-1601136291253-d7d8c9c7c6f6?w=1200&q=85",
  Tenerife: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200&q=85",
  "La Palma": "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200&q=85",
  Default: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85",
};

function getPropertyImage(location: string) {
  for (const [key, url] of Object.entries(ISLAND_IMAGES)) {
    if (location.toLowerCase().includes(key.toLowerCase())) return url;
  }
  return ISLAND_IMAGES.Default;
}

const AMENITIES = [
  { icon: Wifi, label: "Free Wi-Fi" },
  { icon: Waves, label: "Ocean views" },
  { icon: Wind, label: "Air conditioning" },
  { icon: Car, label: "Free parking" },
];

const bookingSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().min(6, "Phone number is required"),
  startDate: z.string().min(1, "Check-in date is required"),
  endDate: z.string().min(1, "Check-out date is required"),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return isBefore(parseISO(data.startDate), parseISO(data.endDate));
  },
  { message: "Check-out must be after check-in", path: ["endDate"] }
);

type BookingFormValues = z.infer<typeof bookingSchema>;

function MiniCalendar({
  bookedRanges,
}: {
  bookedRanges: { start: string; end: string }[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const today = new Date();

  const isBooked = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return bookedRanges.some((r) => r.start <= dateStr && r.end > dateStr);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm">{format(currentMonth, "MMMM yyyy")}</span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const booked = isBooked(day);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, currentMonth);
          const isPast = isBefore(day, today) && !isToday;
          return (
            <div
              key={day.toISOString()}
              className={`
                h-7 flex items-center justify-center rounded text-xs
                ${!inMonth ? "opacity-30" : ""}
                ${booked ? "bg-red-100 text-red-700 font-medium" : ""}
                ${isPast && !booked ? "text-muted-foreground opacity-50" : ""}
                ${isToday ? "ring-2 ring-primary font-bold" : ""}
              `}
              title={booked ? "Booked" : undefined}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-border inline-block" />
          Available
        </span>
      </div>
    </div>
  );
}

export default function PublicProperty() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState<string>("");

  const { data: property, isLoading: loadingProp } = useGetProperty(propertyId, {
    query: { enabled: !!propertyId },
  });
  const { data: bookings } = useListBookings(
    { propertyId },
    { query: { enabled: !!propertyId } }
  );
  const createBooking = useCreateBooking();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      startDate: "",
      endDate: "",
      notes: "",
    },
  });

  const watchStart = form.watch("startDate");
  const watchEnd = form.watch("endDate");

  const nights =
    watchStart && watchEnd && isBefore(parseISO(watchStart), parseISO(watchEnd))
      ? differenceInCalendarDays(parseISO(watchEnd), parseISO(watchStart))
      : 0;

  const estimatedTotal =
    nights > 0 && property?.nightlyRate != null
      ? nights * property.nightlyRate
      : null;

  const bookedRanges = (bookings ?? [])
    .filter((b) => b.status !== "cancelled")
    .map((b) => ({ start: b.startDate, end: b.endDate }));

  const onSubmit = async (values: BookingFormValues) => {
    try {
      const result = await createBooking.mutateAsync({
        data: {
          propertyId,
          guestName: `${values.firstName} ${values.lastName}`,
          guestEmail: values.email,
          guestPhone: values.phone,
          startDate: values.startDate,
          endDate: values.endDate,
          source: "Direct",
          status: "pending",
          totalPrice: estimatedTotal ?? undefined,
          notes: values.notes || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      setConfirmedRef(`ISL-${result.id.toString().padStart(4, "0")}`);
      setConfirmed(true);
      form.reset();
      setShowBookingForm(false);
    } catch {
      toast.error("Failed to submit booking. Please try again.");
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");

  if (loadingProp) {
    return (
      <PublicLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!property) {
    return (
      <PublicLayout>
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg font-medium">Property not found.</p>
          <Link href="/stay">
            <Button variant="link" className="mt-2">Back to properties</Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/stay" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 no-underline transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to properties
        </Link>

        <div className="relative rounded-2xl overflow-hidden h-64 sm:h-80 mb-8 shadow-lg">
          <img
            src={getPropertyImage(property.location)}
            alt={property.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {property.vvLicense && (
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/90 text-foreground shadow">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                VV Licensed · {property.vvLicense}
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-7">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
                  {property.name}
                </h1>
                <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0 mt-1">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-semibold text-foreground">4.9</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {property.location}
                </span>
                {property.maxGuests && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Up to {property.maxGuests} guests
                  </span>
                )}
                {property.nightlyRate != null && (
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Euro className="h-4 w-4" />
                    {property.nightlyRate}/night
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {property.description && (
              <div>
                <h2 className="font-bold text-lg mb-2">About this property</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>
            )}

            <div>
              <h2 className="font-bold text-lg mb-4">Amenities</h2>
              <div className="grid grid-cols-2 gap-3">
                {AMENITIES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-lg mb-4">Availability</h2>
              <div className="rounded-xl border bg-card p-4 inline-block">
                <MiniCalendar bookedRanges={bookedRanges} />
              </div>
            </div>
          </div>

          <div>
            <div className="sticky top-20 rounded-2xl border bg-card shadow-md p-6 space-y-5">
              <div className="text-center">
                {property.nightlyRate != null && (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-extrabold text-primary">
                      €{property.nightlyRate}
                    </span>
                    <span className="text-muted-foreground text-sm">/ night</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-1 text-yellow-500 mt-1">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-sm font-medium text-foreground">4.9 · Excellent</span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Check-in
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={watchStart}
                    onChange={(e) => form.setValue("startDate", e.target.value, { shouldValidate: true })}
                    className="mt-1 w-full text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    data-testid="quick-start-date"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Check-out
                  </label>
                  <input
                    type="date"
                    min={watchStart || today}
                    value={watchEnd}
                    onChange={(e) => form.setValue("endDate", e.target.value, { shouldValidate: true })}
                    className="mt-1 w-full text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    data-testid="quick-end-date"
                  />
                </div>
              </div>

              {nights > 0 && estimatedTotal !== null && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      €{property.nightlyRate} × {nights} night{nights !== 1 ? "s" : ""}
                    </span>
                    <span>€{estimatedTotal.toFixed(2)}</span>
                  </div>
                  {property.igicEnabled && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>IGIC (7%)</span>
                      <span>€{(estimatedTotal * 0.07).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      €{(property.igicEnabled ? estimatedTotal * 1.07 : estimatedTotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                className="w-full h-11 text-base font-bold"
                onClick={() => {
                  if (!isSignedIn) {
                    openSignIn({ redirectUrl: window.location.href });
                  } else {
                    setShowBookingForm(true);
                  }
                }}
                disabled={!watchStart || !watchEnd || nights <= 0}
                data-testid="button-book-now"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                {!watchStart || !watchEnd
                  ? "Select dates to book"
                  : isSignedIn
                  ? "Request to Book"
                  : "Sign in to Book"}
              </Button>

              <div className="space-y-2">
                {[
                  "No booking fees",
                  "Instant confirmation email",
                  "Direct contact with owner",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete your booking</DialogTitle>
            <DialogDescription>
              {nights > 0 && (
                <>
                  {property.name} · {nights} night{nights !== 1 ? "s" : ""} ·{" "}
                  {watchStart && format(parseISO(watchStart), "MMM d")} –{" "}
                  {watchEnd && format(parseISO(watchEnd), "MMM d, yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} autoFocus data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+34 ..." {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in</FormLabel>
                      <FormControl>
                        <Input type="date" min={today} {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out</FormLabel>
                      <FormControl>
                        <Input type="date" min={watchStart || today} {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Any special requests or questions for the owner..."
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {estimatedTotal !== null && nights > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm font-medium flex justify-between">
                  <span>Estimated total ({nights} night{nights !== 1 ? "s" : ""})</span>
                  <span className="text-primary font-bold">
                    €{(property.igicEnabled ? estimatedTotal * 1.07 : estimatedTotal).toFixed(2)}
                  </span>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBookingForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createBooking.isPending}
                  data-testid="button-submit-booking"
                >
                  {createBooking.isPending ? "Submitting..." : "Confirm Booking Request"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmed} onOpenChange={setConfirmed}>
        <DialogContent className="max-w-sm text-center">
          <div className="pt-4 pb-2 flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl">Booking request received!</DialogTitle>
              <DialogDescription className="mt-2">
                Your booking request for{" "}
                <span className="font-semibold text-foreground">{property.name}</span> has been
                submitted. The owner will confirm shortly via email.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted rounded-xl px-6 py-4 w-full">
              <p className="text-xs text-muted-foreground mb-1">Reference number</p>
              <p className="text-2xl font-bold tracking-widest text-primary" data-testid="text-booking-ref">
                {confirmedRef}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button
                className="w-full"
                onClick={() => {
                  setConfirmed(false);
                  setLocation("/stay");
                }}
                data-testid="button-back-home"
              >
                Browse more properties
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
