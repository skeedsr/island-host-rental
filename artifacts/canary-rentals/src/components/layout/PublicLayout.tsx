import { Link } from "wouter";
import { Home } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/stay" className="flex items-center gap-2.5 group no-underline">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Home className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              Isla Rentals
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/stay" className="hover:text-foreground transition-colors no-underline">
              Properties
            </Link>
          </nav>
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
      <Toaster richColors position="top-right" />
    </div>
  );
}
