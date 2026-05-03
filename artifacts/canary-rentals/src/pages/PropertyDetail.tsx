import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetProperty, 
  useListBookings, 
  useSyncPropertyIcal, 
  getGetPropertyQueryKey,
  useUpdateProperty
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, MapPin, Copy, RefreshCw, Euro, Users, ArrowLeft, Calendar as CalendarIcon, CheckCircle2, XCircle, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [photoIdx, setPhotoIdx] = useState(0);

  const { data: property, isLoading: loadingProperty } = useGetProperty(propertyId, {
    query: { enabled: !!propertyId, queryKey: getGetPropertyQueryKey(propertyId) }
  });

  const { data: bookings, isLoading: loadingBookings } = useListBookings({ propertyId });
  const syncIcal = useSyncPropertyIcal();

  const handleSync = async () => {
    try {
      toast.info("Started iCal sync...");
      const result = await syncIcal.mutateAsync({ id: propertyId });
      toast.success(`Sync complete! ${result.synced} bookings synced, ${result.conflicts} conflicts, ${result.errors.length} errors.`);
      queryClient.invalidateQueries({ queryKey: getGetPropertyQueryKey(propertyId) });
    } catch (error) {
      toast.error("Failed to sync iCal");
    }
  };

  const handleCopyIcalExport = () => {
    if (!property) return;
    const url = `${window.location.origin}/api/properties/${property.id}/calendar.ics?token=${property.icalExportToken}`;
    navigator.clipboard.writeText(url);
    toast.success("iCal export URL copied to clipboard");
  };

  // Prepare dates for calendar
  const bookedDates = bookings
    ?.filter(b => b.status === "confirmed" || b.status === "blocked")
    ?.flatMap(b => {
      const dates = [];
      const start = parseISO(b.startDate);
      const end = parseISO(b.endDate);
      let current = new Date(start);
      while (current < end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }) || [];

  if (loadingProperty) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-[400px] md:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Building className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Property Not Found</h2>
        <p className="text-muted-foreground mb-6">The property you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => setLocation("/properties")}>Back to Properties</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/properties")} className="mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{property.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{property.location}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href={`/properties/${property.id}/edit`}>Edit</Link>
          </Button>
          <Button onClick={handleSync} disabled={syncIcal.isPending} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncIcal.isPending ? 'animate-spin' : ''}`} />
            Sync Calendars
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Overview</TabsTrigger>
              <TabsTrigger value="photos" className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Foto
                {property.photos && property.photos.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-semibold">{property.photos.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Calendar</TabsTrigger>
              <TabsTrigger value="sync" className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">iCal Sync</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {property.description && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                      <p className="text-sm">{property.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Nightly Rate</p>
                      <p className="text-lg font-semibold">€{property.nightly_rate}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Max Guests</p>
                      <p className="text-lg font-semibold">{property.max_guests}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">VV License</p>
                      <Badge variant="outline" className="font-mono bg-accent border-none">{property.vvLicense}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Tax Settings</p>
                      <div className="flex items-center gap-2">
                        {property.igicEnabled ? (
                          <><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-sm font-medium">IGIC (7%)</span></>
                        ) : (
                          <><XCircle className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">No IGIC</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-0.5">
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>Latest bookings for this property</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/bookings?propertyId=${property.id}`}>View All</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingBookings ? (
                    <div className="space-y-4 py-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : bookings && bookings.length > 0 ? (
                    <div className="space-y-4 pt-4">
                      {bookings.slice(0, 5).map(booking => (
                        <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{booking.guestName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(booking.startDate), "MMM d")} - {format(parseISO(booking.endDate), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className={
                              booking.source === 'Airbnb' ? 'border-chart-3 text-chart-3' :
                              booking.source === 'Booking.com' ? 'border-chart-4 text-chart-4' :
                              booking.source === 'VRBO' ? 'border-chart-2 text-chart-2' :
                              booking.source === 'Direct' ? 'border-chart-1 text-chart-1' : ''
                            }>
                              {booking.source}
                            </Badge>
                            <div className="text-right">
                              <p className="text-sm font-medium">{booking.totalPrice ? `€${booking.totalPrice}` : '—'}</p>
                              <p className="text-xs text-muted-foreground capitalize">{booking.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No bookings found for this property.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="photos" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Foto della proprietà</CardTitle>
                    <CardDescription>
                      {property.photos?.length
                        ? `${property.photos.length} foto caricate`
                        : "Nessuna foto aggiunta"}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/properties/${property.id}/edit`}>Gestisci foto</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {!property.photos || property.photos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                      <ImageIcon className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">Nessuna foto</p>
                      <p className="text-sm mt-1">Aggiungi foto modificando la proprietà.</p>
                      <Button variant="link" asChild className="mt-2">
                        <Link href={`/properties/${property.id}/edit`}>Aggiungi foto →</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Main photo viewer */}
                      <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
                        <img
                          src={property.photos[photoIdx]}
                          alt={`Foto ${photoIdx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23f1f5f9'/%3E%3Ctext x='200' y='120' text-anchor='middle' fill='%2394a3b8' font-size='14'%3EImmagine non disponibile%3C/text%3E%3C/svg%3E";
                          }}
                        />
                        {property.photos.length > 1 && (
                          <>
                            <button
                              onClick={() => setPhotoIdx((i) => (i - 1 + property.photos.length) % property.photos.length)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setPhotoIdx((i) => (i + 1) % property.photos.length)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                              {photoIdx + 1} / {property.photos.length}
                            </div>
                          </>
                        )}
                      </div>
                      {/* Thumbnails */}
                      {property.photos.length > 1 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {property.photos.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setPhotoIdx(idx)}
                              className={`aspect-video rounded-md overflow-hidden border-2 transition-all ${
                                idx === photoIdx ? "border-primary shadow-md scale-105" : "border-transparent opacity-60 hover:opacity-90"
                              }`}
                            >
                              <img
                                src={url}
                                alt={`Thumb ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-center">
                    <Calendar
                      mode="multiple"
                      selected={bookedDates}
                      className="rounded-md border shadow-sm p-4 w-full max-w-[400px]"
                      modifiers={{ booked: bookedDates }}
                      modifiersStyles={{
                        booked: { 
                          backgroundColor: 'hsl(var(--primary) / 0.15)', 
                          color: 'hsl(var(--primary))',
                          fontWeight: 'bold',
                          borderRadius: 0
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sync" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>iCal Export</CardTitle>
                  <CardDescription>Share this calendar with external platforms (Airbnb, Booking.com, etc.)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="export-url">Export URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="export-url" 
                        readOnly 
                        value={`${window.location.origin}/api/properties/${property.id}/calendar.ics?token=${property.icalExportToken}`} 
                        className="font-mono text-xs bg-muted"
                      />
                      <Button variant="secondary" onClick={handleCopyIcalExport}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>iCal Imports</CardTitle>
                  <CardDescription>External calendars synced to this property</CardDescription>
                </CardHeader>
                <CardContent>
                  {property.icalImportUrls && property.icalImportUrls.length > 0 ? (
                    <div className="space-y-4">
                      {property.icalImportUrls.map((url, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                          <div className="truncate font-mono text-xs text-muted-foreground mr-4 max-w-[400px]">
                            {url}
                          </div>
                          <Badge variant="outline">Active</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">No import URLs configured.</p>
                      <Button variant="link" asChild className="mt-2">
                        <Link href={`/properties/${property.id}/edit`}>Edit property to add URLs</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" asChild>
                <Link href={`/bookings/new?propertyId=${property.id}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Add Booking
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleSync}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncIcal.isPending ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sync Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                {property.syncStatus === 'syncing' ? (
                  <Badge variant="outline" className="text-primary border-primary">Syncing</Badge>
                ) : property.syncStatus === 'error' ? (
                  <Badge variant="destructive">Error</Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">OK</Badge>
                )}
              </div>
              <div className="flex justify-between items-center text-sm border-t pt-4">
                <span className="text-muted-foreground">Last Synced</span>
                <span className="font-medium">
                  {property.lastSyncAt ? format(parseISO(property.lastSyncAt), 'MMM d, HH:mm') : 'Never'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
