import { useState } from "react";
import { Link } from "wouter";
import { useListProperties, useDeleteProperty, getListPropertiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Users, Euro, Plus, MoreHorizontal, Building, RefreshCw, Trash2, Edit } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function Properties() {
  const { data: properties, isLoading } = useListProperties();
  const deleteProperty = useDeleteProperty();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProperty.mutateAsync({ id: deleteId });
      toast.success("Property deleted successfully");
      queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
    } catch (error) {
      toast.error("Failed to delete property");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">Manage your portfolio of vacation rentals.</p>
        </div>
        <Link href="/properties/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-24 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : properties?.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed text-center animate-in fade-in-50">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Building className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No properties</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
            You haven't added any properties yet. Add your first vacation rental to start managing bookings.
          </p>
          <Link href="/properties/new">
            <Button>Add Property</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties?.map((property) => (
            <Card key={property.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl leading-tight line-clamp-1" title={property.name}>
                      {property.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{property.location}</span>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 -mr-2">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/properties/${property.id}`} className="cursor-pointer w-full flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/properties/${property.id}/edit`} className="cursor-pointer w-full flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Edit Property
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() => setDeleteId(property.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="mb-4">
                  <Badge variant="outline" className="font-mono bg-accent text-accent-foreground border-transparent px-2.5 py-1">
                    VV: {property.vvLicense}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Euro className="h-3.5 w-3.5" /> Nightly Rate</span>
                    <span className="font-medium text-foreground">€{property.nightly_rate}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Max Guests</span>
                    <span className="font-medium text-foreground">{property.max_guests} Guests</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {property.igicEnabled && (
                    <Badge variant="secondary" className="text-xs">IGIC Enabled (7%)</Badge>
                  )}
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <RefreshCw className={`h-3 w-3 ${property.syncStatus === 'syncing' ? 'animate-spin text-primary' : property.syncStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} />
                    {property.syncStatus === 'syncing' ? 'Syncing...' : 
                     property.lastSyncAt ? `Synced ${formatDistanceToNow(parseISO(property.lastSyncAt), { addSuffix: true })}` : 'Never synced'}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6 mt-auto">
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/properties/${property.id}`}>View Property</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the property
              and all associated bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProperty.isPending}
            >
              {deleteProperty.isPending ? "Deleting..." : "Delete Property"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
