import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, LogOut, ChevronDown, Star, Clock, Building2, LayoutDashboard, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PublicLayoutProps {
  children: React.ReactNode;
}

const SECTIONS = [
  { href: "/stay/vacacional", label: "Vacacional", icon: Star, color: "text-blue-600" },
  { href: "/stay/media-temporada", label: "Media Temporada", icon: Clock, color: "text-emerald-600" },
  { href: "/stay/larga-temporada", label: "Larga Temporada", icon: Building2, color: "text-amber-600" },
];

async function elevateToAdmin(): Promise<boolean> {
  const res = await fetch("/api/auth/elevate", {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { customer, isLoggedIn, logout } = useCustomerAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [elevating, setElevating] = useState(false);
  const [location] = useLocation();

  const handleAreaHost = async () => {
    setElevating(true);
    try {
      const ok = await elevateToAdmin();
      if (ok) {
        window.location.href = "/";
      } else {
        toast.error("Non hai i permessi per accedere all'area host.");
        setElevating(false);
      }
    } catch {
      toast.error("Errore di connessione. Riprova.");
      setElevating(false);
    }
  };

  const activeSection = SECTIONS.find((s) => location.startsWith(s.href));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/stay" className="flex items-center gap-2.5 group no-underline flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Home className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              Isla Rentals
            </span>
          </Link>

          {/* Nav sections — desktop */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {SECTIONS.map(({ href, label, icon: Icon, color }) => {
              const isActive = location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? color : ""}`} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Nav sections — mobile dropdown */}
          <div className="md:hidden flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-sm">
                  {activeSection ? (
                    <>
                      <activeSection.icon className={`h-3.5 w-3.5 ${activeSection.color}`} />
                      {activeSection.label}
                    </>
                  ) : (
                    "Affitti"
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {SECTIONS.map(({ href, label, icon: Icon, color }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href} className="flex items-center gap-2 no-underline text-foreground cursor-pointer">
                      <Icon className={`h-4 w-4 ${color}`} />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User auth */}
          <div className="flex-shrink-0">
            {isLoggedIn && customer ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="hidden sm:inline">{customer.firstName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {customer.isHost && (
                    <>
                      <DropdownMenuItem
                        onClick={handleAreaHost}
                        disabled={elevating}
                        className="cursor-pointer"
                      >
                        {elevating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                        )}
                        Area Host
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Esci
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowAuth(true)}>
                <User className="h-4 w-4 mr-1.5" />
                Accedi
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/40 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Home className="h-3 w-3 text-white" />
              </div>
              <span className="font-medium text-foreground">Isla Rentals</span>
            </div>
            <p>© {new Date().getFullYear()} Isla Rentals · Canary Islands</p>
          </div>
        </div>
      </footer>

      <CustomerAuthModal open={showAuth} onOpenChange={setShowAuth} />
      <Toaster richColors position="top-right" />
    </div>
  );
}
