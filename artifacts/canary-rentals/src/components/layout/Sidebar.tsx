import { Home, Building, Calendar, ListTodo, Settings, LogOut, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/properties", label: "Properties", icon: Building },
    { href: "/bookings", label: "Bookings", icon: ListTodo },
    { href: "/calendar", label: "Calendar", icon: Calendar },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-sidebar text-sidebar-foreground">
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
          const isActive = location === link.href || (location.startsWith(link.href) && link.href !== "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
          <Settings className="h-4 w-4" />
          Settings
        </div>
        <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
          <LogOut className="h-4 w-4" />
          Sign out
        </div>
      </div>
    </aside>
  );
}
