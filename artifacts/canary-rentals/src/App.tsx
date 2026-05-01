import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const queryClient = new QueryClient();

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
