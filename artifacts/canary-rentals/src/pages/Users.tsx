import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users as UsersIcon, ShieldCheck, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClerkUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  role: string;
  createdAt: number;
  lastSignInAt: number | null;
}

export default function Users() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingChange, setPendingChange] = useState<{
    userId: string;
    email: string;
    newRole: "user" | "admin";
  } | null>(null);

  const { data: users, isLoading } = useQuery<ClerkUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "user" | "admin" }) => {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: `Role updated to "${variables.role}"` });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setPendingChange(null);
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
      setPendingChange(null);
    },
  });

  const handleRoleToggle = (user: ClerkUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setPendingChange({ userId: user.id, email: user.email, newRole });
  };

  const confirmRoleChange = () => {
    if (!pendingChange) return;
    updateRole.mutate({ userId: pendingChange.userId, role: pendingChange.newRole });
  };

  const adminCount = users?.filter((u) => u.role === "admin").length ?? 0;
  const userCount = users?.filter((u) => u.role !== "admin").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Grant or revoke admin access for registered accounts.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users?.length ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Total users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount || "—"}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userCount || "—"}</p>
                <p className="text-sm text-muted-foreground">Regular users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Accounts</CardTitle>
          <CardDescription>
            Toggle between <strong>user</strong> (can browse and book) and{" "}
            <strong>admin</strong> (full dashboard access).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UsersIcon className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">No users yet</p>
              <p className="text-sm mt-1">Users will appear here after they sign up.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last sign in</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.imageUrl} />
                          <AvatarFallback>
                            {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {user.firstName || user.lastName
                              ? `${user.firstName} ${user.lastName}`.trim()
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                          <ShieldCheck className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <User className="h-3 w-3" />
                          User
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {user.lastSignInAt
                          ? format(new Date(user.lastSignInAt), "MMM d, yyyy")
                          : "Never"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={user.role === "admin" ? "outline" : "default"}
                        className="w-full text-xs"
                        onClick={() => handleRoleToggle(user)}
                        disabled={updateRole.isPending}
                        data-testid={`button-toggle-role-${user.id}`}
                      >
                        {user.role === "admin" ? "Revoke admin" : "Make admin"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingChange !== null}
        onOpenChange={(open) => !open && setPendingChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingChange?.newRole === "admin"
                ? "Grant admin access?"
                : "Revoke admin access?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingChange?.newRole === "admin" ? (
                <>
                  <strong>{pendingChange.email}</strong> will have full access to the dashboard,
                  all properties, bookings, and user management.
                </>
              ) : (
                <>
                  <strong>{pendingChange?.email}</strong> will be demoted to a regular user and
                  lose access to the admin dashboard.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              className={
                pendingChange?.newRole === "admin"
                  ? ""
                  : "bg-destructive hover:bg-destructive/90"
              }
              data-testid="button-confirm-role-change"
            >
              {pendingChange?.newRole === "admin" ? "Grant Admin" : "Revoke Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
