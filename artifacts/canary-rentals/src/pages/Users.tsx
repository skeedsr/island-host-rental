import { useState, useMemo } from "react";
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
  Home,
  MoreHorizontal,
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

// ── Types ──────────────────────────────────────────────────────────────────

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
  adminRole: AdminRole | null;
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

interface CustomerDetail extends Customer {
  assignments: PropertyAssignment[];
}

interface Property {
  id: number;
  name: string;
  location: string;
}

// A unified row can be either a system account or a customer account
type Row =
  | { kind: "system"; user: AdminUser }
  | { kind: "customer"; user: Customer };

// Filter categories
type FilterKey = "tutti" | "clienti" | "host" | "super_admin";

const FILTER_LABELS: Record<FilterKey, string> = {
  tutti: "Tutti",
  clienti: "Solo Clienti",
  host: "Host",
  super_admin: "Super Admin",
};

function matchesFilter(row: Row, filter: FilterKey): boolean {
  if (filter === "tutti") return true;
  if (row.kind === "system") {
    if (filter === "host") return row.user.role === "property_manager";
    if (filter === "super_admin") return row.user.role === "super_admin";
    return false;
  }
  if (filter === "clienti") return row.user.adminRole === null;
  if (filter === "host") return row.user.adminRole === "property_manager";
  if (filter === "super_admin") return row.user.adminRole === "super_admin";
  return false;
}

// Sort order: super_admin first, then hosts, then plain clients
function rowSortKey(row: Row): number {
  if (row.kind === "system") {
    return row.user.role === "super_admin" ? 0 : 1;
  }
  if (row.user.adminRole === "super_admin") return 0;
  if (row.user.adminRole === "property_manager") return 1;
  return 2;
}

// ── Status badges ──────────────────────────────────────────────────────────

function StatusBadges({ row }: { row: Row }) {
  if (row.kind === "system") {
    if (row.user.role === "super_admin") {
      return (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="default" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Super Admin
          </Badge>
          <span className="text-xs text-muted-foreground">(sistema)</span>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="secondary" className="gap-1">
          <Home className="h-3 w-3" />
          Host
        </Badge>
        <span className="text-xs text-muted-foreground">(sistema)</span>
      </div>
    );
  }

  // customer
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <UserCircle2 className="h-3 w-3" />
        Cliente
      </Badge>
      {row.user.adminRole === "property_manager" && (
        <Badge variant="secondary" className="gap-1">
          <Home className="h-3 w-3" />
          Host
        </Badge>
      )}
      {row.user.adminRole === "super_admin" && (
        <Badge variant="default" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Super Admin
        </Badge>
      )}
    </div>
  );
}

// ── API helper ─────────────────────────────────────────────────────────────

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
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

// ── Main component ─────────────────────────────────────────────────────────

export default function Users() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<FilterKey>("tutti");

  // System admin state
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [assignUser, setAssignUser] = useState<AdminUserDetail | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // Customer state
  const [makeHostCustomer, setMakeHostCustomer] = useState<Customer | null>(null);
  const [revokeHostCustomer, setRevokeHostCustomer] = useState<Customer | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [assignCustomer, setAssignCustomer] = useState<CustomerDetail | null>(null);
  const [assignCustomerLoading, setAssignCustomerLoading] = useState(false);

  const { data: systemUsers = [], isLoading: isLoadingSystem } = useQuery<AdminUser[]>({
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

  const isLoading = isLoadingSystem || isLoadingCustomers;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
  };

  // Build unified sorted list
  const allRows = useMemo<Row[]>(() => {
    const rows: Row[] = [
      ...systemUsers.map((u): Row => ({ kind: "system", user: u })),
      ...customers.map((c): Row => ({ kind: "customer", user: c })),
    ];
    return rows.sort((a, b) => rowSortKey(a) - rowSortKey(b));
  }, [systemUsers, customers]);

  const filteredRows = useMemo(
    () => allRows.filter((r) => matchesFilter(r, activeFilter)),
    [allRows, activeFilter],
  );

  // Count per filter
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { tutti: 0, clienti: 0, host: 0, super_admin: 0 };
    for (const row of allRows) {
      c.tutti++;
      if (matchesFilter(row, "clienti")) c.clienti++;
      if (matchesFilter(row, "host")) c.host++;
      if (matchesFilter(row, "super_admin")) c.super_admin++;
    }
    return c;
  }, [allRows]);

  // ── System admin handlers ─────────────────────────────────────────────────

  async function loadUserDetail(user: AdminUser) {
    try {
      const detail = await apiRequest<AdminUserDetail>(`/api/admin/users/${user.id}`);
      setAssignUser(detail);
    } catch {
      toast.error("Impossibile caricare i dettagli utente");
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;
    try {
      await apiRequest(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
      toast.success(`Utente "${deleteUser.username}" eliminato`);
      invalidateAll();
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
      const updated = await apiRequest<AdminUserDetail>(`/api/admin/users/${assignUser.id}`);
      setAssignUser(updated);
      invalidateAll();
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
      await apiRequest(`/api/admin/property-assignments/${assignmentId}`, { method: "DELETE" });
      const updated = await apiRequest<AdminUserDetail>(`/api/admin/users/${assignUser.id}`);
      setAssignUser(updated);
      invalidateAll();
      toast.success("Assegnazione rimossa");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAssignLoading(false);
    }
  }

  // ── Customer role handlers ────────────────────────────────────────────────

  async function handleRevokeHost() {
    if (!revokeHostCustomer) return;
    setRevokeLoading(true);
    try {
      await apiRequest(`/api/admin/customers/${revokeHostCustomer.id}/admin-role`, {
        method: "PUT",
        body: JSON.stringify({ role: null }),
      });
      toast.success(
        `Ruolo host rimosso da ${revokeHostCustomer.firstName} ${revokeHostCustomer.lastName}`,
      );
      invalidateAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRevokeLoading(false);
      setRevokeHostCustomer(null);
    }
  }

  async function loadCustomerDetail(customer: Customer) {
    try {
      const detail = await apiRequest<CustomerDetail>(
        `/api/admin/customers/${customer.id}/assignments`,
      );
      setAssignCustomer(detail);
    } catch {
      toast.error("Impossibile caricare le assegnazioni");
    }
  }

  async function handleAddCustomerAssignment(propertyId: number) {
    if (!assignCustomer) return;
    setAssignCustomerLoading(true);
    try {
      await apiRequest(`/api/admin/customers/${assignCustomer.id}/assignments`, {
        method: "POST",
        body: JSON.stringify({ propertyId }),
      });
      const updated = await apiRequest<CustomerDetail>(
        `/api/admin/customers/${assignCustomer.id}/assignments`,
      );
      setAssignCustomer(updated);
      invalidateAll();
      toast.success("Proprietà assegnata");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAssignCustomerLoading(false);
    }
  }

  async function handleRemoveCustomerAssignment(assignmentId: number) {
    if (!assignCustomer) return;
    setAssignCustomerLoading(true);
    try {
      await apiRequest(`/api/admin/property-assignments/${assignmentId}`, { method: "DELETE" });
      const updated = await apiRequest<CustomerDetail>(
        `/api/admin/customers/${assignCustomer.id}/assignments`,
      );
      setAssignCustomer(updated);
      invalidateAll();
      toast.success("Assegnazione rimossa");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAssignCustomerLoading(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utenti</h1>
          <p className="text-muted-foreground">Gestione degli utenti della piattaforma.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Accesso negato
            </CardTitle>
            <CardDescription>Solo i Super Admin possono gestire gli utenti.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utenti</h1>
          <p className="text-muted-foreground">
            Tutti gli utenti registrati sulla piattaforma.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuovo account di sistema
        </Button>
      </div>

      {/* ── Filter chips ── */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              activeFilter === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            ].join(" ")}
          >
            {FILTER_LABELS[key]}
            <span
              className={[
                "rounded-full px-1.5 py-0.5 text-xs",
                activeFilter === key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Unified users table ── */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {activeFilter === "tutti"
                  ? "Nessun utente registrato."
                  : `Nessun utente corrisponde al filtro "${FILTER_LABELS[activeFilter]}".`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Proprietà</TableHead>
                  <TableHead className="hidden lg:table-cell">Registrato</TableHead>
                  <TableHead className="w-[52px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <UnifiedRow
                    key={row.kind === "system" ? `sys-${row.user.id}` : `cust-${row.user.id}`}
                    row={row}
                    onEditSystem={(u) => setEditUser(u)}
                    onDeleteSystem={(u) => setDeleteUser(u)}
                    onManageSystemProps={(u) => loadUserDetail(u)}
                    onMakeHost={(c) => setMakeHostCustomer(c)}
                    onRevokeHost={(c) => setRevokeHostCustomer(c)}
                    onManageCustomerProps={(c) => loadCustomerDetail(c)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs & Sheets ── */}

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidateAll}
      />

      {makeHostCustomer && (
        <MakeHostDialog
          customer={makeHostCustomer}
          open={!!makeHostCustomer}
          onOpenChange={(o) => !o && setMakeHostCustomer(null)}
          onSuccess={() => {
            invalidateAll();
            setMakeHostCustomer(null);
          }}
        />
      )}

      <AlertDialog
        open={!!revokeHostCustomer}
        onOpenChange={(o) => !o && setRevokeHostCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoca ruolo host</AlertDialogTitle>
            <AlertDialogDescription>
              Rimuovi il ruolo host da{" "}
              <strong>
                {revokeHostCustomer?.firstName} {revokeHostCustomer?.lastName}
              </strong>
              ? Il cliente non potrà più accedere al pannello admin e perderà le
              assegnazioni di proprietà.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeLoading}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeHost}
              disabled={revokeLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeLoading ? "Rimozione..." : "Revoca host"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(o) => !o && setEditUser(null)}
          onSuccess={() => {
            invalidateAll();
            setEditUser(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deleteUser}
        onOpenChange={(o) => !o && setDeleteUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina account di sistema</AlertDialogTitle>
            <AlertDialogDescription>
              Elimina l'account <strong>{deleteUser?.username}</strong>? Tutte le
              assegnazioni di proprietà saranno rimosse. Azione irreversibile.
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

      {/* System user property assignments */}
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
            <AssignmentList
              assignments={assignUser.assignments}
              properties={properties}
              loading={assignLoading}
              onAdd={handleAddAssignment}
              onRemove={handleRemoveAssignment}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Customer property assignments */}
      <Sheet open={!!assignCustomer} onOpenChange={(o) => !o && setAssignCustomer(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Proprietà assegnate</SheetTitle>
            <SheetDescription>
              {assignCustomer && (
                <>
                  Gestisci le proprietà visibili a{" "}
                  <strong>
                    {assignCustomer.firstName} {assignCustomer.lastName}
                  </strong>
                  .
                </>
              )}
            </SheetDescription>
          </SheetHeader>
          {assignCustomer && (
            <AssignmentList
              assignments={assignCustomer.assignments}
              properties={properties}
              loading={assignCustomerLoading}
              onAdd={handleAddCustomerAssignment}
              onRemove={handleRemoveCustomerAssignment}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Unified table row ──────────────────────────────────────────────────────

function UnifiedRow({
  row,
  onEditSystem,
  onDeleteSystem,
  onManageSystemProps,
  onMakeHost,
  onRevokeHost,
  onManageCustomerProps,
}: {
  row: Row;
  onEditSystem: (u: AdminUser) => void;
  onDeleteSystem: (u: AdminUser) => void;
  onManageSystemProps: (u: AdminUser) => void;
  onMakeHost: (c: Customer) => void;
  onRevokeHost: (c: Customer) => void;
  onManageCustomerProps: (c: Customer) => void;
}) {
  if (row.kind === "system") {
    const u = row.user;
    const label = u.displayName ?? u.username;
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
              {label.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium leading-none">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <UserCog className="h-3 w-3" />
                @{u.username}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <StatusBadges row={row} />
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {u.role === "property_manager" ? (
            <button
              onClick={() => onManageSystemProps(u)}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
            >
              Gestisci assegnazioni
            </button>
          ) : (
            <span className="text-sm text-muted-foreground">Accesso completo</span>
          )}
        </TableCell>
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
          {format(parseISO(u.createdAt), "dd/MM/yyyy")}
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
              <DropdownMenuLabel>Account di sistema</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEditSystem(u)}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              {u.role === "property_manager" && (
                <DropdownMenuItem onClick={() => onManageSystemProps(u)}>
                  <Building className="h-4 w-4 mr-2" />
                  Proprietà assegnate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteSystem(u)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  }

  // Customer row
  const c = row.user;
  const isHost = c.adminRole !== null;
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-sm shrink-0">
            {c.firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium leading-none">
              {c.firstName} {c.lastName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadges row={row} />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {c.adminRole === "property_manager" ? (
          <button
            onClick={() => onManageCustomerProps(c)}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            Gestisci assegnazioni
          </button>
        ) : c.adminRole === "super_admin" ? (
          <span className="text-sm text-muted-foreground">Accesso completo</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
        {format(parseISO(c.createdAt), "dd/MM/yyyy")}
      </TableCell>
      <TableCell>
        {isHost ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Azioni</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {c.firstName} {c.lastName}
              </DropdownMenuLabel>
              {c.adminRole === "property_manager" && (
                <DropdownMenuItem onClick={() => onManageCustomerProps(c)}>
                  <Building className="h-4 w-4 mr-2" />
                  Proprietà assegnate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRevokeHost(c)}
              >
                <X className="h-4 w-4 mr-2" />
                Revoca ruolo host
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onMakeHost(c)}
          >
            <Home className="h-3.5 w-3.5" />
            Rendi Host
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Shared: Assignment list ────────────────────────────────────────────────

function AssignmentList({
  assignments,
  properties,
  loading,
  onAdd,
  onRemove,
}: {
  assignments: PropertyAssignment[];
  properties: Property[];
  loading: boolean;
  onAdd: (propertyId: number) => void;
  onRemove: (assignmentId: number) => void;
}) {
  const assignedIds = new Set(assignments.map((a) => a.propertyId));
  const unassigned = properties.filter((p) => !assignedIds.has(p.id));

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Assegnate</h4>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna proprietà assegnata.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{a.propertyName}</p>
                  <p className="text-xs text-muted-foreground">{a.propertyLocation}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  disabled={loading}
                  onClick={() => onRemove(a.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {unassigned.length > 0 && (
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
                  <p className="text-xs text-muted-foreground">{p.location}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => onAdd(p.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Assegna
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create system admin dialog ─────────────────────────────────────────────

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
      toast.success(`Account "${form.username}" creato`);
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
          <DialogTitle>Nuovo account di sistema</DialogTitle>
          <DialogDescription>
            Crea un account amministrativo con username e password dedicati.
            Per abilitare un cliente esistente, usa invece il pulsante "Rendi Host".
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
                <SelectItem value="property_manager">Host / Property Manager</SelectItem>
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
              {loading ? "Creazione..." : "Crea account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Make host dialog ───────────────────────────────────────────────────────

function MakeHostDialog({
  customer,
  open,
  onOpenChange,
  onSuccess,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AdminRole>("property_manager");
  const [error, setError] = useState("");

  const roleLabel = role === "property_manager" ? "Property Manager (Host)" : "Super Admin";

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest(`/api/admin/customers/${customer.id}/admin-role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      toast.success(
        `${customer.firstName} ${customer.lastName} è ora ${roleLabel}`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) { setError(""); setRole("property_manager"); }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Abilita accesso admin
          </DialogTitle>
          <DialogDescription>
            Aggiungi un ruolo admin a{" "}
            <strong>
              {customer.firstName} {customer.lastName}
            </strong>{" "}
            senza creare un nuovo account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-md bg-muted/50 border px-3 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium text-foreground">
                {customer.firstName} {customer.lastName}
              </p>
              <p className="text-xs">{customer.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mh-role">Ruolo da assegnare</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as AdminRole)}
            >
              <SelectTrigger id="mh-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="property_manager">
                  <div className="flex items-center gap-2">
                    <Home className="h-3.5 w-3.5" />
                    Property Manager (Host)
                  </div>
                </SelectItem>
                <SelectItem value="super_admin">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Super Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            Il cliente accederà al pannello admin usando la sua email e la
            password che usa già su questo sito.
          </p>
        </div>

        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => { onOpenChange(false); setError(""); setRole("property_manager"); }}
          >
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="gap-2">
            {role === "super_admin" ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Home className="h-4 w-4" />
            )}
            {loading ? "Abilitazione..." : `Abilita come ${roleLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit system user dialog ────────────────────────────────────────────────

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
          <DialogTitle>Modifica account di sistema</DialogTitle>
          <DialogDescription>@{user.username}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-displayName">Nome visualizzato</Label>
            <Input
              id="e-displayName"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="Nome Cognome"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-role">Ruolo</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v as AdminRole }))}
            >
              <SelectTrigger id="e-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="property_manager">Host / Property Manager</SelectItem>
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
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
