import { useState } from "react";
import { Link } from "wouter";
import { usePublicProperties } from "@/hooks/use-public-properties";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Users,
  Euro,
  Star,
  Wifi,
  Zap,
  Droplets,
  Building2,
  Clock,
} from "lucide-react";
import {
  type RentalTypeKey,
  RENTAL_TYPE_LABELS,
  RENTAL_TYPE_DESCRIPTIONS,
  RENTAL_TYPE_PRICE_UNIT,
  hasRentalType,
  getRentalTypePrice,
  getTemporadaConfig,
  isTemporada,
} from "@/lib/rental-types";

const ISLAND_IMAGES: Record<string, string> = {
  Lanzarote: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  Fuerteventura: "https://images.unsplash.com/photo-1548019979-afb56a792aab?w=800&q=80",
  "Gran Canaria": "https://images.unsplash.com/photo-1601136291253-d7d8c9c7c6f6?w=800&q=80",
  Tenerife: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80",
  "La Palma": "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
  Default: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
};

function getPropertyImage(location: string): string {
  for (const [key, url] of Object.entries(ISLAND_IMAGES)) {
    if (location.toLowerCase().includes(key.toLowerCase())) return url;
  }
  return ISLAND_IMAGES.Default;
}

const SECTION_COLORS: Record<RentalTypeKey, string> = {
  vacacional: "from-[#0057A8] via-[#0071CE] to-[#0099D4]",
  "media-temporada": "from-[#0F7B5A] via-[#129E74] to-[#14B87F]",
  "larga-temporada": "from-[#7B4F0F] via-[#9E6512] to-[#B87A14]",
};

const SECTION_BADGE_COLORS: Record<RentalTypeKey, string> = {
  vacacional: "bg-blue-100 text-blue-800",
  "media-temporada": "bg-emerald-100 text-emerald-800",
  "larga-temporada": "bg-amber-100 text-amber-800",
};

interface Props {
  type: RentalTypeKey;
}

export default function PublicSection({ type }: Props) {
  const [search, setSearch] = useState("");
  const { data: allProperties, isLoading } = usePublicProperties();

  const filtered = (allProperties ?? [])
    .filter((p) => hasRentalType(p.rentalTypes, type))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase())
    );

  const priceUnit = RENTAL_TYPE_PRICE_UNIT[type];
  const label = RENTAL_TYPE_LABELS[type];
  const description = RENTAL_TYPE_DESCRIPTIONS[type];
  const gradientClass = SECTION_COLORS[type];
  const badgeClass = SECTION_BADGE_COLORS[type];

  return (
    <PublicLayout>
      <section className={`relative overflow-hidden bg-gradient-to-br ${gradientClass} text-white py-16 sm:py-20`}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-white/90 text-sm font-medium mb-4">
            {type === "vacacional" && <Star className="h-3.5 w-3.5" />}
            {type === "media-temporada" && <Clock className="h-3.5 w-3.5" />}
            {type === "larga-temporada" && <Building2 className="h-3.5 w-3.5" />}
            {label}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            {label}
          </h1>
          <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
            {description}
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Cerca per isola o nome proprietà..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 text-base bg-white text-foreground border-0 shadow-lg rounded-xl"
            />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">
              {search ? `Risultati per "${search}"` : `Proprietà ${label}`}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isLoading
                ? "Caricamento..."
                : `${filtered.length} proprietà disponibil${filtered.length !== 1 ? "i" : "e"}`}
            </p>
          </div>
          <span className={`hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${badgeClass}`}>
            {label}
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border bg-card shadow-sm">
                <Skeleton className="h-52 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="mx-auto h-10 w-10 mb-3 opacity-30" />
            <p className="text-lg font-medium">Nessuna proprietà trovata</p>
            <p className="text-sm mt-1">
              {search
                ? "Prova un termine di ricerca diverso."
                : `Nessuna proprietà disponibile per ${label} al momento.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((property) => {
              const price = getRentalTypePrice(property.rentalTypes, type, property.nightly_rate);
              const temporadaConfig =
                isTemporada(type) ? getTemporadaConfig(property.rentalTypes, type) : null;

              return (
                <Link
                  key={property.id}
                  href={`/stay/${property.id}?type=${type}`}
                  className="group rounded-2xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 no-underline text-foreground block"
                >
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={
                        property.photos && property.photos.length > 0
                          ? property.photos[0]
                          : getPropertyImage(property.location)
                      }
                      alt={property.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {property.vvLicense && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-white/90 text-foreground shadow">
                          VV Licensed
                        </span>
                      </div>
                    )}
                    {price != null && (
                      <div className="absolute bottom-3 right-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-white shadow">
                          <Euro className="h-3 w-3" />
                          {price}
                          <span className="font-normal opacity-80">{priceUnit}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-lg leading-tight line-clamp-1">
                        {property.name}
                      </h3>
                      <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-xs font-medium text-foreground">4.9</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">{property.location}</span>
                    </div>

                    {temporadaConfig && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {temporadaConfig.internetIncluded && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <Wifi className="h-3 w-3" /> Internet
                          </span>
                        )}
                        {temporadaConfig.electricityIncluded && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <Zap className="h-3 w-3" /> Luce
                          </span>
                        )}
                        {temporadaConfig.waterIncluded && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <Droplets className="h-3 w-3" /> Acqua
                          </span>
                        )}
                        {temporadaConfig.communityFeesIncluded && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <Building2 className="h-3 w-3" /> Comunità
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {property.max_guests && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          Fino a {property.max_guests} ospiti
                        </span>
                      )}
                      <span className="ml-auto text-sm font-semibold text-primary group-hover:underline">
                        {isTemporada(type) ? "Richiedi info →" : "Vedi e prenota →"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {isTemporada(type) && (
        <section className="bg-muted/40 py-12 border-t">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-xl font-bold mb-2">
              Come funziona {label}
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              {type === "media-temporada"
                ? "Contratti flessibili da 1 a 6 mesi. Prezzo mensile tutto incluso secondo quanto indicato. Contatta il proprietario per verificare disponibilità e firmare il contratto."
                : "Affitti a lungo termine oltre 6 mesi. Ideale per residenti e lavoratori. Contatta il proprietario per disponibilità e condizioni contrattuali."}
            </p>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
