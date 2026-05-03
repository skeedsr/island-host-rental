import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  Pencil,
  ShieldCheck,
  UserCog,
  Building,
  X,
  KeyRound,
  UserCircle2,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal } from "lucide-react";

type AdminRole = "super_admin" | "property_manager";

interface AdminUser {
  id: number;
  username: string;
  role: AdminRole;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
}

interface PropertyAssignment {
  id: number;
  propertyId: number;
  propertyName: string;
  propertyLocation: string;
}

interface AdminUserDetail extends AdminUser {
  assignments: PropertyAssignment[];
}

interface Property {
  id: number;
  name: string;
  location: string;
}

function RoleBadge({ role }: { role: AdminRole }) {
  if (role === "super_admin") {
    return (
      <Badge variant="default" className="gap-1">
        <ShieldCheck className="h-3 w-3" />
        Super Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <UserCog className="h-3 w-3" />
      Property Manager
    </Badge>
  );
}

async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export default function Users() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [assignUser, setAssignUser] = useState<AdminUserDetail | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<AdminUser[]>({
    queryKey: ["admin", "users"],
    queryFn: () => apiRequest("/api/admin/users"),
    enabled: isSuperAdmin,
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["admin", "customers"],
    queryFn: () => apiRequest("/api/admin/customers"),
    enabled: isSuperAdmin,
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => apiRequest("/api/properties"),
    enabled: isSuperAdmin,
  });

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  async function loadUserDetail(user: AdminUser) {
    try {
      const detail = await apiRequest<AdminUserDetail>(
        `/api/admin/users/${user.id}`,
      );
      setAssignUser(detail);
    } catch {
      toast.error("Impossibile caricare i dettagli utente");
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;
    try {
      await apiRequest(`/api/admin/users/${deleteUser.id}`, {
        method: "DELETE",
      });
      toast.success(`Utente "${deleteUser.username}" eliminato`);
      invalidateUsers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteUser(null);
    }
  }

  async function handleAddAssignment(propertyId: number) {
    if (!assignUser) return;
    setAssignLoading(true);
    try {
      await apiRequest("/api/admin/property-assignments", {
        method: "POST",
        body: JSON.stringify({ adminUserId: assignUser.id, propertyId }),
      });
      const updated = await apiRequest<AdminUserDetail>(
        `/api/admin/users/${assignUser.id}`,
      );
      setAssignUser(updated);
      invalidateUsers();
      toast.success("Proprietà assegnata");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: number) {
    if (!assignUser) return;
    setAssignLoading(true);
    try {
      await apiRequest(`/api/admin/property-assignments/${assignmentId}`, {
        method: "DELETE",
      });
      const updated = await apiRequest<AdminUserDetail>(
        `/api/admin/users/${assignUser.id}`,
      );
      setAssignUser(updated);
      invalidateUsers();
      toast.success("Assegnazione rimossa");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAssignLoading(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utenti</h1>
          <p className="text-muted-foreground">
            Gestione degli utenti della piattaforma.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Accesso negato
            </CardTitle>
            <CardDescription>
              Solo i Super Admin possono gestire gli utenti.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utenti</h1>
          <p className="text-muted-foreground">
            Tutti gli utenti registrati sulla piattaforma.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Amministratore
        </Button>
      </div>

      <Tabs defaultValue="admin">
        <TabsList className="mb-4">
          <TabsTrigger value="admin" className="gap-2">
            <UserCog className="h-4 w-4" />
            Amministratori
            {!isLoadingUsers && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {users.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <UserCircle2 className="h-4 w-4" />
            Clienti
            {!isLoadingCustomers && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {customers.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Amministratori ── */}
        <TabsContent value="admin">
          <Card>
            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <UsersIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">
                    Nessun utente trovato. Crea il primo utente.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Proprietà assegnate
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Registrato
                      </TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                              {(user.displayName ?? user.username)
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium leading-none">
                                {user.displayName ?? user.username}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {user.role === "property_manager" ? (
                            <button
                              onClick={() => loadUserDetail(user)}
                              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                            >
                              Gestisci assegnazioni
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(parseISO(user.createdAt), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Azioni</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setEditUser(user)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifica
                              </DropdownMenuItem>
                              {user.role === "property_manager" && (
                                <DropdownMenuItem onClick={() => loadUserDetail(user)}>
                                  <Building className="h-4 w-4 mr-2" />
                                  Proprietà assegnate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Clienti ── */}
        <TabsContent value="customers">
          <Card>
            <CardContent className="p-0">
              {isLoadingCustomers ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <UserCircle2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">
                    Nessun cliente registrato ancora.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    I clienti appaiono qui dopo la registrazione sul sito pubblico.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden md:table-cell">Telefono</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead className="hidden md:table-cell">Registrato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-sm shrink-0">
                              {c.firstName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium leading-none">
                                {c.firstName} {c.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                #{c.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {c.email}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {c.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              {c.phone}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <UserCircle2 className="h-3 w-3" />
                            Cliente
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(parseISO(c.createdAt), "dd/MM/yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create user dialog */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidateUsers}
      />

      {/* Edit user dialog */}
      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(o) => !o && setEditUser(null)}
          onSuccess={() => {
            invalidateUsers();
            setEditUser(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteUser}
        onOpenChange={(o) => !o && setDeleteUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina utente</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'utente{" "}
              <strong>{deleteUser?.username}</strong>? Tutte le assegnazioni di
              proprietà saranno rimosse. Questa azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Property assignments sheet */}
      <Sheet open={!!assignUser} onOpenChange={(o) => !o && setAssignUser(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Proprietà assegnate</SheetTitle>
            <SheetDescription>
              {assignUser && (
                <>
                  Gestisci le proprietà visibili a{" "}
                  <strong>{assignUser.displayName ?? assignUser.username}</strong>.
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {assignUser && (
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Assegnate</h4>
                {assignUser.assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nessuna proprietà assegnata.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignUser.assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{a.propertyName}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.propertyLocation}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={assignLoading}
                          onClick={() => handleRemoveAssignment(a.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(() => {
                const assignedIds = new Set(
                  assignUser.assignments.map((a) => a.propertyId),
                );
                const unassigned = properties.filter(
                  (p) => !assignedIds.has(p.id),
                );
                if (unassigned.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Aggiungi proprietà</h4>
                    <div className="space-y-2">
                      {unassigned.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-md border border-dashed p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.location}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={assignLoading}
                            onClick={() => handleAddAssignment(p.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Assegna
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create User Dialog                                                    */
/* ------------------------------------------------------------------ */

function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "property_manager" as AdminRole,
    displayName: "",
  });
  const [error, setError] = useState("");

  const reset = () => {
    setForm({ username: "", password: "", role: "property_manager", displayName: "" });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          role: form.role,
          displayName: form.displayName || undefined,
        }),
      });
      toast.success(`Utente "${form.username}" creato`);
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo utente</DialogTitle>
          <DialogDescription>
            Crea un nuovo account amministratore.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-username">Username</Label>
            <Input
              id="c-username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="mario.rossi"
              required
              minLength={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-displayName">Nome visualizzato</Label>
            <Input
              id="c-displayName"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="Mario Rossi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-role">Ruolo</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v as AdminRole }))}
            >
              <SelectTrigger id="c-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="property_manager">Property Manager</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-password">Password</Label>
            <Input
              id="c-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Minimo 8 caratteri"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); reset(); }}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creazione..." : "Crea utente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Edit User Dialog                                                       */
/* ------------------------------------------------------------------ */

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: AdminUser;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    role: user.role,
    displayName: user.displayName ?? "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        role: form.role,
        displayName: form.displayName || undefined,
      };
      if (form.password) payload.password = form.password;
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success(`Utente "${user.username}" aggiornato`);
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica utente</DialogTitle>
          <DialogDescription>@{user.username}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-displayName">Nome visualizzato</Label>
            <Input
              id="e-displayName"
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({ ...f, displayName: e.target.value }))
              }
              placeholder="Nome Cognome"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-role">Ruolo</Label>
            <Select
              value={form.role}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, role: v as AdminRole }))
              }
            >
              <SelectTrigger id="e-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="property_manager">Property Manager</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-password" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Nuova password{" "}
              <span className="text-muted-foreground font-normal">
                (lascia vuoto per non cambiare)
              </span>
            </Label>
            <Input
              id="e-password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
