import { useState } from "react";
import { Link } from "wouter";
import { usePublicProperties } from "@/hooks/use-public-properties";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Users, Euro, Star, Waves, Sun, Wind, Clock, Building2, ArrowRight } from "lucide-react";
import { hasRentalType, getRentalTypePrice } from "@/lib/rental-types";

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

export default function PublicLanding() {
  const [search, setSearch] = useState("");
  const { data: properties, isLoading } = usePublicProperties();

  const filtered = (properties ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
  );

  const vacacionalCount = (properties ?? []).filter((p) => hasRentalType(p.rentalTypes, "vacacional")).length;
  const mediaCount = (properties ?? []).filter((p) => hasRentalType(p.rentalTypes, "media-temporada")).length;
  const largaCount = (properties ?? []).filter((p) => hasRentalType(p.rentalTypes, "larga-temporada")).length;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0057A8] via-[#0071CE] to-[#0099D4] text-white py-20 sm:py-28">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex justify-center gap-6 mb-6 text-white/70">
            <div className="flex items-center gap-1.5 text-sm"><Waves className="h-4 w-4" /> Oceano Atlantico</div>
            <div className="flex items-center gap-1.5 text-sm"><Sun className="h-4 w-4" /> 300+ giorni di sole</div>
            <div className="flex items-center gap-1.5 text-sm"><Wind className="h-4 w-4" /> Clima ideale</div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
            Canary Islands Rentals
            <br />
            <span className="text-[#F5C518]">Trova la tua casa</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Vacanze brevi, soggiorni medi o lungo termine — affitti diretti senza commissioni su Lanzarote, Tenerife, Fuerteventura e altre isole.
          </p>

          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Cerca per isola o nome proprietà..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-13 text-base bg-white text-foreground border-0 shadow-lg rounded-xl"
              data-testid="input-search"
            />
          </div>
        </div>
      </section>

      {/* Rental Type Sections */}
      {!search && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Scegli il tipo di affitto</h2>
            <p className="text-muted-foreground text-sm">
              Tre categorie per ogni esigenza — dal soggiorno breve all'affitto residenziale
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {/* Vacacional */}
            <Link
              href="/stay/vacacional"
              className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50 to-blue-100/60 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 no-underline text-foreground block"
            >
              <div className="mb-4">
                <div className="h-11 w-11 rounded-xl bg-blue-500 flex items-center justify-center mb-3">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">Vacacional</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Affitti turistici a breve termine. Prenota per notti.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                  {isLoading ? "—" : `${vacacionalCount} proprietà`}
                </span>
                <span className="text-sm font-semibold text-blue-600 group-hover:gap-2 flex items-center gap-1 transition-all">
                  Esplora <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Media Temporada */}
            <Link
              href="/stay/media-temporada"
              className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 no-underline text-foreground block"
            >
              <div className="mb-4">
                <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center mb-3">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">Media Temporada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Da 1 a 6 mesi. Prezzo mensile, spese spesso incluse.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  {isLoading ? "—" : `${mediaCount} proprietà`}
                </span>
                <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                  Esplora <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Larga Temporada */}
            <Link
              href="/stay/larga-temporada"
              className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50 to-amber-100/60 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 no-underline text-foreground block"
            >
              <div className="mb-4">
                <div className="h-11 w-11 rounded-xl bg-amber-600 flex items-center justify-center mb-3">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">Larga Temporada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Oltre 6 mesi. Ideale per residenti e lavoratori.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  {isLoading ? "—" : `${largaCount} proprietà`}
                </span>
                <span className="text-sm font-semibold text-amber-600 flex items-center gap-1">
                  Esplora <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* All Properties (always shown, filtered when searching) */}
      <section className={`max-w-6xl mx-auto px-4 sm:px-6 ${search ? "py-14" : "pb-14 pt-0"}`}>
        {search && (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Risultati per "{search}"</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {isLoading ? "Caricamento..." : `${filtered.length} proprietà trovate`}
              </p>
            </div>
          </div>
        )}
        {!search && (
          <div className="flex items-center justify-between mb-8 pt-2 border-t">
            <div>
              <h2 className="text-2xl font-bold">Tutte le proprietà</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {isLoading ? "Caricamento..." : `${filtered.length} proprietà disponibili`}
              </p>
            </div>
          </div>
        )}

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
            <p className="text-sm mt-1">Prova un termine di ricerca diverso.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((property) => {
              const vacPrice = getRentalTypePrice(property.rentalTypes, "vacacional", property.nightly_rate);
              return (
                <Link
                  key={property.id}
                  href={`/stay/${property.id}`}
                  className="group rounded-2xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 no-underline text-foreground block"
                  data-testid={`card-property-${property.id}`}
                >
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={property.photos && property.photos.length > 0 ? property.photos[0] : getPropertyImage(property.location)}
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
                    <div className="absolute bottom-3 right-3">
                      {vacPrice != null ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-white shadow">
                          <Euro className="h-3 w-3" />
                          {vacPrice}/notte
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-white shadow">
                          Richiedi info
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-lg leading-tight line-clamp-1">{property.name}</h3>
                      <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-xs font-medium text-foreground">4.9</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">{property.location}</span>
                    </div>
                    {property.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {property.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {property.max_guests && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          Fino a {property.max_guests} ospiti
                        </span>
                      )}
                      <span className="ml-auto text-sm font-semibold text-primary group-hover:underline">
                        Vedi &amp; prenota →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Why book direct */}
      <section className="bg-muted/40 py-14 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Perché prenotare diretto?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: "💶", title: "Nessuna commissione", text: "Paghi esattamente quello che vedi, senza sovrapprezzi delle piattaforme." },
              { icon: "🤝", title: "Contatto diretto", text: "Parla direttamente con il proprietario per qualsiasi esigenza." },
              { icon: "🔑", title: "Conferma immediata", text: "Ricevi la conferma della prenotazione direttamente via email." },
            ].map((item) => (
              <div key={item.title} className="bg-card rounded-2xl border p-6 text-center shadow-sm">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
