import { useState } from "react";
import { Link } from "wouter";
import { useListProperties } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Users, Euro, Star, Waves, Sun, Wind } from "lucide-react";

const ISLAND_IMAGES: Record<string, string> = {
  Lanzarote:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  Fuerteventura:
    "https://images.unsplash.com/photo-1548019979-afb56a792aab?w=800&q=80",
  "Gran Canaria":
    "https://images.unsplash.com/photo-1601136291253-d7d8c9c7c6f6?w=800&q=80",
  Tenerife:
    "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80",
  "La Palma":
    "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
  Default:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
};

function getPropertyImage(location: string): string {
  for (const [key, url] of Object.entries(ISLAND_IMAGES)) {
    if (location.toLowerCase().includes(key.toLowerCase())) return url;
  }
  return ISLAND_IMAGES.Default;
}

export default function PublicLanding() {
  const [search, setSearch] = useState("");
  const { data: properties, isLoading } = useListProperties();

  const filtered = (properties ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PublicLayout>
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
            <div className="flex items-center gap-1.5 text-sm">
              <Waves className="h-4 w-4" /> Atlantic Ocean
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Sun className="h-4 w-4" /> 300+ sunny days
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Wind className="h-4 w-4" /> Trade winds
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
            Your Canary Islands
            <br />
            <span className="text-[#F5C518]">escape awaits</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Discover hand-picked vacation rentals across Lanzarote, Fuerteventura,
            Tenerife, and more. Book directly, no fees.
          </p>

          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by island or property name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-13 text-base bg-white text-foreground border-0 shadow-lg rounded-xl"
              data-testid="input-search"
            />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">
              {search ? `Results for "${search}"` : "All Properties"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isLoading
                ? "Loading..."
                : `${filtered.length} propert${filtered.length !== 1 ? "ies" : "y"} available`}
            </p>
          </div>
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
            <p className="text-lg font-medium">No properties found</p>
            <p className="text-sm mt-1">Try a different search term.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((property) => (
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-white shadow">
                        <Euro className="h-3 w-3" />
                        {property.nightly_rate != null
                          ? `${property.nightly_rate}/night`
                          : "Ask"}
                      </span>
                    </div>
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
                    {property.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {property.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {property.max_guests && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          Up to {property.max_guests} guests
                        </span>
                      )}
                      <span className="ml-auto text-sm font-semibold text-primary group-hover:underline">
                        View &amp; book →
                      </span>
                    </div>
                  </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="bg-muted/40 py-14 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Why book direct?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: "💶",
                title: "No booking fees",
                text: "Skip the platform commissions — pay exactly what you see.",
              },
              {
                icon: "🤝",
                title: "Direct contact",
                text: "Reach the property owner directly for any question or request.",
              },
              {
                icon: "🔑",
                title: "Instant confirmation",
                text: "Receive a booking confirmation straight to your inbox.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-card rounded-2xl border p-6 text-center shadow-sm"
              >
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
