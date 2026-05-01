import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout/Shell";
import { AdminGuard } from "@/components/AdminGuard";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import Bookings from "@/pages/Bookings";
import BookingDetail from "@/pages/BookingDetail";
import CalendarPage from "@/pages/CalendarPage";
import Users from "@/pages/Users";

import PublicLanding from "@/pages/PublicLanding";
import PublicProperty from "@/pages/PublicProperty";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const queryClient = new QueryClient();

function ClerkAuthSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/stay" component={PublicLanding} />
      <Route path="/stay/:id" component={PublicProperty} />

      <Route>
        <AdminGuard>
          <Shell>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/properties" component={Properties} />
              <Route path="/properties/:id" component={PropertyDetail} />
              <Route path="/bookings" component={Bookings} />
              <Route path="/bookings/:id" component={BookingDetail} />
              <Route path="/calendar" component={CalendarPage} />
              <Route path="/admin/users" component={Users} />
              <Route component={NotFound} />
            </Switch>
          </Shell>
        </AdminGuard>
      </Route>
    </Switch>
  );
}

function AppInner() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ClerkAuthSync />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function SetupRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">🔐</div>
        <h1 className="text-2xl font-bold">Authentication Setup Required</h1>
        <p className="text-muted-foreground">
          To enable login and role-based access, open the{" "}
          <strong>Auth</strong> tab in the Replit workspace toolbar and connect
          your Clerk account. Then set <code className="bg-muted px-1 rounded">VITE_CLERK_PUBLISHABLE_KEY</code>{" "}
          and <code className="bg-muted px-1 rounded">CLERK_SECRET_KEY</code> in Secrets.
        </p>
      </div>
    </div>
  );
}

function App() {
  if (!PUBLISHABLE_KEY) {
    return <SetupRequired />;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/stay">
      <AppInner />
    </ClerkProvider>
  );
}

export default App;
