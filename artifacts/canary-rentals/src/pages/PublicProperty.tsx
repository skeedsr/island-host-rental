import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";
import type { CustomerUser } from "@/hooks/use-customer-auth";
import {
  useGetProperty,
  useListBookings,
  useCreateBooking,
  getListBookingsQueryKey,
  getGetPropertyQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  ChevronLeft,
  ChevronRight,
  X,
  Expand,
  Zap,
  Droplets,
  Building2,
  Clock,
  MessageSquare,
  Phone,
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
import {
  parseRentalTypeFromSearch,
  isTemporada,
  getRentalTypePrice,
  getTemporadaConfig,
  RENTAL_TYPE_LABELS,
  RENTAL_TYPE_PRICE_UNIT,
} from "@/lib/rental-types";

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

const inquirySchema = z.object({
  name: z.string().min(2, "Il nome è obbligatorio"),
  email: z.string().email("Inserisci un'email valida"),
  phone: z.string().min(6, "Il telefono è obbligatorio"),
  startDate: z.string().min(1, "La data di inizio è obbligatoria"),
  endDate: z.string().min(1, "La data di fine è obbligatoria"),
  message: z.string().optional(),
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return isBefore(parseISO(data.startDate), parseISO(data.endDate));
  },
  { message: "La data di fine deve essere successiva a quella di inizio", path: ["endDate"] }
);

type BookingFormValues = z.infer<typeof bookingSchema>;
type InquiryFormValues = z.infer<typeof inquirySchema>;

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
          >‹</button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next month"
          >›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
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
              className={`h-7 flex items-center justify-center rounded text-xs
                ${!inMonth ? "opacity-30" : ""}
                ${booked ? "bg-red-100 text-red-700 font-medium" : ""}
                ${isPast && !booked ? "text-muted-foreground opacity-50" : ""}
                ${isToday ? "ring-2 ring-primary font-bold" : ""}`}
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
  const { customer, isLoggedIn } = useCustomerAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState<string>("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryRef, setInquiryRef] = useState<string>("");

  const rentalType = parseRentalTypeFromSearch(window.location.search);
  const isTemporadaType = isTemporada(rentalType);
  const backHref = isTemporadaType ? `/stay/${rentalType}` : "/stay/vacacional";
  const typeLabel = RENTAL_TYPE_LABELS[rentalType];

  const openLightbox = useCallback((idx: number) => {
    setLightboxIdx(idx);
    document.body.style.overflow = "hidden";
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIdx(null);
    document.body.style.overflow = "";
  }, []);

  const handleBookClick = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
    } else {
      setShowBookingForm(true);
    }
  };

  const handleAuthSuccess = (user: CustomerUser) => {
    form.setValue("firstName", user.firstName);
    form.setValue("lastName", user.lastName);
    form.setValue("email", user.email);
    setShowBookingForm(true);
  };

  const { data: property, isLoading: loadingProp } = useGetProperty(propertyId, {
    query: { enabled: !!propertyId, queryKey: getGetPropertyQueryKey(propertyId) },
  });
  const { data: bookings } = useListBookings(
    { propertyId },
    { query: { enabled: !!propertyId, queryKey: getListBookingsQueryKey({ propertyId }) } }
  );
  const createBooking = useCreateBooking();

  useEffect(() => {
    if (lightboxIdx === null) return;
    const photos = property?.photos?.length ? property.photos : null;
    if (!photos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") setLightboxIdx((i) => i !== null ? (i + 1) % photos.length : i);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => i !== null ? (i - 1 + photos.length) % photos.length : i);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIdx, property?.photos, closeLightbox]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", startDate: "", endDate: "", notes: "" },
  });

  const inquiryForm = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", email: "", phone: "", startDate: "", endDate: "", message: "" },
  });

  const watchStart = form.watch("startDate");
  const watchEnd = form.watch("endDate");

  const nights =
    watchStart && watchEnd && isBefore(parseISO(watchStart), parseISO(watchEnd))
      ? differenceInCalendarDays(parseISO(watchEnd), parseISO(watchStart))
      : 0;

  const estimatedTotal =
    nights > 0 && property?.nightly_rate != null
      ? nights * property.nightly_rate
      : null;

  const bookedRanges = (bookings ?? [])
    .filter((b) => b.status !== "cancelled")
    .map((b) => ({ start: b.startDate, end: b.endDate }));

  const onSubmit = async (values: BookingFormValues) => {
    setBookingError(null);
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
          rentalType,
          totalPrice: estimatedTotal ?? undefined,
          notes: values.notes || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      setConfirmedRef(`ISL-${result.id.toString().padStart(4, "0")}`);
      setConfirmed(true);
      form.reset();
      setShowBookingForm(false);
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string }; status?: number };
      if (apiErr?.status === 409 && apiErr?.data?.error) {
        setBookingError(apiErr.data.error);
      } else {
        toast.error("Invio non riuscito. Riprova.");
      }
    }
  };

  const onInquirySubmit = async (values: InquiryFormValues) => {
    try {
      const result = await createBooking.mutateAsync({
        data: {
          propertyId,
          guestName: values.name,
          guestEmail: values.email,
          guestPhone: values.phone,
          startDate: values.startDate,
          endDate: values.endDate,
          source: "Direct",
          status: "pending",
          rentalType,
          notes: values.message || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      setInquiryRef(`ISL-${result.id.toString().padStart(4, "0")}`);
      setShowInquiryForm(false);
      inquiryForm.reset();
      setInquirySent(true);
    } catch {
      toast.error("Invio non riuscito. Riprova.");
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

  const displayPrice = getRentalTypePrice(property.rentalTypes, rentalType, property.nightly_rate);
  const priceUnit = RENTAL_TYPE_PRICE_UNIT[rentalType];
  const temporadaConfig = isTemporadaType ? getTemporadaConfig(property.rentalTypes, rentalType) : null;

  const TEMPORADA_COLORS: Record<string, string> = {
    "media-temporada": "bg-emerald-100 text-emerald-800",
    "larga-temporada": "bg-amber-100 text-amber-800",
  };
  const badgeColor = TEMPORADA_COLORS[rentalType] ?? "bg-blue-100 text-blue-800";

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Torna a {typeLabel}
          </Link>
          <Badge className={`text-xs ${badgeColor}`}>
            {typeLabel}
          </Badge>
        </div>

        {/* Hero photo gallery */}
        {(() => {
          const photos = property.photos && property.photos.length > 0
            ? property.photos
            : [getPropertyImage(property.location)];
          const idx = Math.min(heroIdx, photos.length - 1);
          return (
            <div className="mb-8">
              <div className="relative rounded-2xl overflow-hidden h-64 sm:h-80 shadow-lg group/hero">
                <img
                  key={idx}
                  src={photos[idx]}
                  alt={`${property.name} — foto ${idx + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-300 cursor-zoom-in"
                  onClick={() => openLightbox(idx)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                <button
                  onClick={() => openLightbox(idx)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover/hero:opacity-100 transition-all"
                  aria-label="Visualizza a schermo intero"
                >
                  <Expand className="h-4 w-4" />
                </button>
                {property.vvLicense && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/90 text-foreground shadow">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                      VV Licensed · {property.vvLicense}
                    </span>
                  </div>
                )}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setHeroIdx((i) => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                      aria-label="Foto precedente"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setHeroIdx((i) => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                      aria-label="Foto successiva"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setHeroIdx(i)}
                          className={`rounded-full transition-all ${i === idx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"}`}
                          aria-label={`Vai alla foto ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => openLightbox(i)}
                      className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-90"}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left column */}
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
                {property.max_guests && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Fino a {property.max_guests} ospiti
                  </span>
                )}
                {displayPrice != null && (
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Euro className="h-4 w-4" />
                    {displayPrice}{priceUnit}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {property.description && (
              <div>
                <h2 className="font-bold text-lg mb-2">Descrizione</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Temporada: utilities included */}
            {isTemporadaType && temporadaConfig && (
              <div>
                <h2 className="font-bold text-lg mb-4">Spese incluse nel canone</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "internetIncluded", icon: Wifi, label: "Internet" },
                    { key: "electricityIncluded", icon: Zap, label: "Luce" },
                    { key: "waterIncluded", icon: Droplets, label: "Acqua" },
                    { key: "communityFeesIncluded", icon: Building2, label: "Spese comunità" },
                  ].map(({ key, icon: Icon, label }) => {
                    const included = temporadaConfig[key as keyof typeof temporadaConfig] as boolean;
                    return (
                      <div key={key} className={`flex items-center gap-2.5 text-sm rounded-lg border px-3 py-2.5 ${included ? "bg-green-50 border-green-200 text-green-800" : "bg-muted/30 border-muted text-muted-foreground"}`}>
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${included ? "bg-green-100" : "bg-muted"}`}>
                          <Icon className={`h-3.5 w-3.5 ${included ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <span className="font-medium">{label}</span>
                          <span className={`ml-1.5 text-xs ${included ? "text-green-700" : "text-muted-foreground"}`}>
                            {included ? "Inclusa" : "Non inclusa"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {rentalType === "media-temporada" && temporadaConfig.maxDurationMonths && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Durata massima: <span className="font-medium text-foreground">{temporadaConfig.maxDurationMonths} {temporadaConfig.maxDurationMonths === 1 ? "mese" : "mesi"}</span>
                  </div>
                )}
              </div>
            )}

            {/* Vacacional: standard amenities */}
            {!isTemporadaType && (
              <div>
                <h2 className="font-bold text-lg mb-4">Dotazioni</h2>
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
            )}

            {/* Vacacional: availability calendar */}
            {!isTemporadaType && (
              <div>
                <h2 className="font-bold text-lg mb-4">Disponibilità</h2>
                <div className="rounded-xl border bg-card p-4 inline-block">
                  <MiniCalendar bookedRanges={bookedRanges} />
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div>
            <div className="sticky top-20 rounded-2xl border bg-card shadow-md p-6 space-y-5">
              <div className="text-center">
                {displayPrice != null ? (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-extrabold text-primary">€{displayPrice}</span>
                    <span className="text-muted-foreground text-sm">{priceUnit}</span>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-muted-foreground">Prezzo su richiesta</p>
                )}
                <div className="flex items-center justify-center gap-1 text-yellow-500 mt-1">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-sm font-medium text-foreground">4.9 · Eccellente</span>
                </div>
              </div>

              <Separator />

              {isTemporadaType ? (
                /* Temporada: inquiry widget */
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-1.5">
                    <p className="font-medium text-foreground">
                      {rentalType === "media-temporada" ? "Affitto medio termine" : "Affitto lungo termine"}
                    </p>
                    <p>
                      {rentalType === "media-temporada"
                        ? "Contatta il proprietario per verificare disponibilità e concordare il contratto."
                        : "Contatta il proprietario per condizioni, disponibilità e contratto di locazione."}
                    </p>
                  </div>

                  <Button
                    className="w-full h-11 text-base font-bold"
                    onClick={() => setShowInquiryForm(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Richiedi informazioni
                  </Button>

                  <div className="space-y-2">
                    {[
                      "Nessuna commissione di agenzia",
                      "Risposta diretta dal proprietario",
                      "Contratto personalizzabile",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Vacacional: booking widget */
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check-in</label>
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
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check-out</label>
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
                        <span className="text-muted-foreground">€{property.nightly_rate} × {nights} notte{nights !== 1 ? "i" : ""}</span>
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
                        <span>Totale</span>
                        <span className="text-primary">€{(property.igicEnabled ? estimatedTotal * 1.07 : estimatedTotal).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full h-11 text-base font-bold"
                    onClick={handleBookClick}
                    disabled={!watchStart || !watchEnd || nights <= 0}
                    data-testid="button-book-now"
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {!watchStart || !watchEnd
                      ? "Seleziona le date"
                      : isLoggedIn ? "Prenota ora" : "Accedi per prenotare"}
                  </Button>

                  <div className="space-y-2">
                    {["No booking fees", "Instant confirmation email", "Direct contact with owner"].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vacacional: booking form dialog */}
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completa la prenotazione</DialogTitle>
            <DialogDescription>
              {nights > 0 && (
                <>
                  {property.name} · {nights} notte{nights !== 1 ? "i" : ""} ·{" "}
                  {watchStart && format(parseISO(watchStart), "d MMM")} –{" "}
                  {watchEnd && format(parseISO(watchEnd), "d MMM yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl><Input {...field} autoFocus data-testid="input-first-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome</FormLabel>
                    <FormControl><Input {...field} data-testid="input-last-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} data-testid="input-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl><Input type="tel" placeholder="+34 ..." {...field} data-testid="input-phone" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in</FormLabel>
                    <FormControl><Input type="date" min={today} {...field} data-testid="input-start-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out</FormLabel>
                    <FormControl><Input type="date" min={watchStart || today} {...field} data-testid="input-end-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaggio (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Richieste speciali o domande per il proprietario..." {...field} data-testid="textarea-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {estimatedTotal !== null && nights > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm font-medium flex justify-between">
                  <span>Totale stimato ({nights} notte{nights !== 1 ? "i" : ""})</span>
                  <span className="text-primary font-bold">
                    €{(property.igicEnabled ? estimatedTotal * 1.07 : estimatedTotal).toFixed(2)}
                  </span>
                </div>
              )}

              {bookingError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 flex items-start gap-2 text-sm text-destructive">
                  <span className="mt-0.5">⚠️</span>
                  <div>
                    <p className="font-semibold">Date non disponibili</p>
                    <p className="mt-0.5">{bookingError}</p>
                    <button type="button" className="mt-2 underline font-medium" onClick={() => { setBookingError(null); setShowBookingForm(false); }}>
                      Scegli altre date →
                    </button>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => { setBookingError(null); setShowBookingForm(false); }}>Annulla</Button>
                <Button type="submit" disabled={createBooking.isPending} data-testid="button-submit-booking">
                  {createBooking.isPending ? "Invio in corso..." : "Conferma richiesta"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Vacacional: confirmed dialog */}
      <Dialog open={confirmed} onOpenChange={setConfirmed}>
        <DialogContent className="max-w-sm text-center">
          <div className="pt-4 pb-2 flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl">Prenotazione ricevuta!</DialogTitle>
              <DialogDescription className="mt-2">
                La tua richiesta per{" "}
                <span className="font-semibold text-foreground">{property.name}</span> è stata inviata. Il proprietario ti confermerà via email.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted rounded-xl px-6 py-4 w-full">
              <p className="text-xs text-muted-foreground mb-1">Numero di riferimento</p>
              <p className="text-2xl font-bold tracking-widest text-primary" data-testid="text-booking-ref">
                {confirmedRef}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button className="w-full" onClick={() => { setConfirmed(false); setLocation("/stay"); }} data-testid="button-back-home">
                Esplora altre proprietà
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Temporada: inquiry dialog */}
      <Dialog open={showInquiryForm} onOpenChange={setShowInquiryForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Richiesta informazioni</DialogTitle>
            <DialogDescription>
              {property.name} · {typeLabel}
            </DialogDescription>
          </DialogHeader>
          <Form {...inquiryForm}>
            <form onSubmit={inquiryForm.handleSubmit(onInquirySubmit)} className="space-y-4 pt-2">
              <FormField control={inquiryForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome e cognome</FormLabel>
                  <FormControl><Input {...field} placeholder="Mario Rossi" autoFocus /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={inquiryForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} placeholder="mario@email.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={inquiryForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl><Input type="tel" {...field} placeholder="+34 ..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={inquiryForm.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inizio desiderato</FormLabel>
                    <FormControl><Input type="date" min={today} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={inquiryForm.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fine desiderata</FormLabel>
                    <FormControl><Input type="date" min={inquiryForm.watch("startDate") || today} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={inquiryForm.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaggio (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Periodo desiderato, durata, domande..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowInquiryForm(false)}>Annulla</Button>
                <Button type="submit">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Invia richiesta
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Temporada: inquiry sent dialog */}
      <Dialog open={inquirySent} onOpenChange={setInquirySent}>
        <DialogContent className="max-w-sm text-center">
          <div className="pt-4 pb-2 flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl">Richiesta inviata!</DialogTitle>
              <DialogDescription className="mt-2">
                La tua richiesta per{" "}
                <span className="font-semibold text-foreground">{property.name}</span> è stata ricevuta. Il proprietario ti contatterà al più presto.
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={() => { setInquirySent(false); setLocation(`/stay/${rentalType}`); }}>
              Torna a {typeLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={handleAuthSuccess} />

      {/* Lightbox */}
      {lightboxIdx !== null && property?.photos && property.photos.length > 0 && (() => {
        const photos = property.photos;
        const li = lightboxIdx;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={closeLightbox}>
            <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10" aria-label="Chiudi">
              <X className="h-6 w-6" />
            </button>
            <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium z-10">
              {li + 1} / {photos.length}
            </span>
            {photos.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => i !== null ? (i - 1 + photos.length) % photos.length : i); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10" aria-label="Foto precedente">
                <ChevronLeft className="h-7 w-7" />
              </button>
            )}
            <img src={photos[li]} alt={`${property.name} — foto ${li + 1}`} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl select-none" onClick={(e) => e.stopPropagation()} />
            {photos.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => i !== null ? (i + 1) % photos.length : i); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10" aria-label="Foto successiva">
                <ChevronRight className="h-7 w-7" />
              </button>
            )}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-2">
                {photos.map((url, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }} className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${i === li ? "border-white scale-110" : "border-white/30 opacity-50 hover:opacity-80"}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </PublicLayout>
  );
}
