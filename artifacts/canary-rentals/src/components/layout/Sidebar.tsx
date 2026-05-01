import { Home, Building, Calendar, ListTodo, ExternalLink, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/properties", label: "Properties", icon: Building },
    { href: "/bookings", label: "Bookings", icon: ListTodo },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/admin/users", label: "Users", icon: Users },
  ];

  const initials =
    user
      ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
        user.primaryEmailAddress?.emailAddress[0]?.toUpperCase() ||
        "A"
      : "A";

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

        <div className="border-t pt-3 mt-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {user?.firstName
                  ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                  : user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/stay" })}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-left"
          >
            <ExternalLink className="h-4 w-4 rotate-180" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
