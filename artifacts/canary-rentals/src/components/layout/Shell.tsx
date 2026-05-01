import { Sidebar } from "./Sidebar";
import { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:hidden">
              <Button variant="ghost" size="icon" className="-m-2.5 p-2.5">
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
              <div className="h-6 w-px bg-border" aria-hidden="true" />
            </div>
            <div className="flex flex-1 items-center justify-end gap-x-4 lg:gap-x-6">
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    A
                  </div>
                  <div className="hidden lg:flex lg:flex-col lg:items-start lg:justify-center">
                    <span className="text-sm font-medium leading-none text-foreground">Admin</span>
                    <span className="text-xs text-muted-foreground">Property Manager</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
