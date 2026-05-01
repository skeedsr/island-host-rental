import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetBooking,
  useUpdateBooking,
  useDeleteBooking,
  useListProperties,
  getGetBookingQueryKey,
  getListBookingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Euro,
  FileText,
  Pencil,
  Trash2,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const SOURCE_COLORS: Record<string, string> = {
  Direct: "bg-blue-100 text-blue-800 border-blue-200",
  Airbnb: "bg-red-100 text-red-800 border-red-200",
  "Booking.com": "bg-teal-100 text-teal-800 border-teal-200",
  VRBO: "bg-amber-100 text-amber-800 border-amber-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  blocked: "bg-purple-100 text-purple-800 border-purple-200",
};

const editSchema = z.object({
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  source: z.string().min(1),
  status: z.string().min(1),
  totalPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const bookingId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) },
  });
  const { data: properties } = useListProperties();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: booking
      ? {
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone ?? "",
          startDate: booking.startDate,
          endDate: booking.endDate,
          source: booking.source,
          status: booking.status,
          totalPrice: booking.totalPrice ?? undefined,
          notes: booking.notes ?? "",
        }
      : undefined,
  });

  const propertyName =
    properties?.find((p) => p.id === booking?.propertyId)?.name ??
    `Property #${booking?.propertyId}`;

  const igicAmount = booking?.igicAmount;
  const nights =
    booking
      ? Math.round(
          (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const onSubmit = async (values: EditValues) => {
    try {
      await updateBooking.mutateAsync({
        id: bookingId,
        data: {
          guestName: values.guestName,
          guestEmail: values.guestEmail,
          guestPhone: values.guestPhone || undefined,
          startDate: values.startDate,
          endDate: values.endDate,
          source: values.source,
          status: values.status,
          totalPrice: values.totalPrice,
          notes: values.notes || undefined,
        },
      });
      toast.success("Booking updated");
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      setEditing(false);
    } catch {
      toast.error("Failed to update booking");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBooking.mutateAsync({ id: bookingId });
      toast.success("Booking deleted");
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      setLocation("/bookings");
    } catch {
      toast.error("Failed to delete booking");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Booking not found.</p>
        <Link href="/bookings">
          <Button variant="link" className="mt-2">Back to bookings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bookings">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{booking.guestName}</h1>
          <p className="text-muted-foreground text-sm">Booking #{booking.id}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(!editing)}
            className="gap-2"
            data-testid="button-edit"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
            onClick={() => setShowDelete(true)}
            data-testid="button-delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guestName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guest Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-guest-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guestEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} data-testid="input-guest-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="guestPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} data-testid="input-guest-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in</FormLabel>
                        <FormControl><Input type="date" {...field} data-testid="input-start-date" /></FormControl>
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
                        <FormControl><Input type="date" {...field} data-testid="input-end-date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger data-testid="select-source"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Direct">Direct</SelectItem>
                            <SelectItem value="Airbnb">Airbnb</SelectItem>
                            <SelectItem value="Booking.com">Booking.com</SelectItem>
                            <SelectItem value="VRBO">VRBO</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Price (EUR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                          data-testid="input-total-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea rows={3} {...field} data-testid="textarea-notes" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateBooking.isPending} data-testid="button-save">
                    {updateBooking.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="text-guest-name">{booking.guestName}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {booking.guestEmail}
                  </div>
                  {booking.guestPhone && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {booking.guestPhone}
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" /> Property
                  </span>
                  <span className="text-sm font-medium">{propertyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Source</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${SOURCE_COLORS[booking.source] ?? SOURCE_COLORS.Other}`}
                    data-testid="badge-source"
                  >
                    {booking.source}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[booking.status] ?? STATUS_COLORS.confirmed}`}
                    data-testid="badge-status"
                  >
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Stay Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Check-in</p>
                  <p className="font-semibold text-sm" data-testid="text-start-date">
                    {format(new Date(booking.startDate), "EEE, MMM d")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(booking.startDate), "yyyy")}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Check-out</p>
                  <p className="font-semibold text-sm" data-testid="text-end-date">
                    {format(new Date(booking.endDate), "EEE, MMM d")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(booking.endDate), "yyyy")}
                  </p>
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {nights} night{nights !== 1 ? "s" : ""}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Euro className="h-3.5 w-3.5" /> Total Revenue
                  </span>
                  <span className="font-bold text-lg" data-testid="text-total-price">
                    {booking.totalPrice != null ? `€${booking.totalPrice.toFixed(2)}` : "—"}
                  </span>
                </div>
                {igicAmount != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" /> IGIC (7%)
                    </span>
                    <span className="text-sm font-medium text-amber-700" data-testid="text-igic">
                      €{igicAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {booking.notes && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Notes
                    </p>
                    <p className="text-sm bg-muted/50 rounded-md p-3" data-testid="text-notes">
                      {booking.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the booking for {booking.guestName}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
