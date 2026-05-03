import { Home, Building, Calendar, ListTodo, ExternalLink, Users, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, isSuperAdmin } = useAuth();

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/properties", label: "Properties", icon: Building },
    { href: "/bookings", label: "Bookings", icon: ListTodo },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    ...(isSuperAdmin ? [{ href: "/admin/users", label: "Users", icon: Users }] : []),
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          Isla Rentals
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            location === link.href ||
            (location.startsWith(link.href) && link.href !== "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3 space-y-1">
        <a
          href="/stay"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Customer View
        </a>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-left"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
