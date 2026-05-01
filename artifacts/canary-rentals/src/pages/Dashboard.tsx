import { 
  useGetDashboardSummary, 
  useGetUpcomingBookings,
  useGetOccupancyStats,
  useGetRevenueStats,
  getGetDashboardSummaryQueryKey,
  getGetUpcomingBookingsQueryKey,
  getGetOccupancyStatsQueryKey,
  getGetRevenueStatsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Users, CalendarCheck, TrendingUp, Key, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area, Cell } from "recharts";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: upcomingBookings, isLoading: loadingUpcoming } = useGetUpcomingBookings();
  const { data: occupancyStats, isLoading: loadingOccupancy } = useGetOccupancyStats();
  const { data: revenueStats, isLoading: loadingRevenue } = useGetRevenueStats();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Monitor your rental portfolio performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bookings/new">
            <Button>Add Booking</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalProperties || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.activeBookings || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Currently checked in</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.occupancyRate ? `${Math.round(summary.occupancyRate)}%` : '0%'}</div>
            )}
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">€{summary?.revenueThisMonth?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Occupancy Overview</CardTitle>
            <CardDescription>Monthly occupancy rates across your portfolio</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            {loadingOccupancy ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={occupancyStats || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickFormatter={(val) => {
                    try {
                      return format(parseISO(`${val}-01`), 'MMM');
                    } catch (e) {
                      return val;
                    }
                  }} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-sm)' }}
                    formatter={(value: number) => [`${Math.round(value)}%`, 'Occupancy']}
                    labelFormatter={(label) => {
                      try {
                        return format(parseISO(`${label}-01`), 'MMMM yyyy');
                      } catch (e) {
                        return label;
                      }
                    }}
                  />
                  <Area type="monotone" dataKey="occupancyRate" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorOccupancy)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Check-ins</CardTitle>
            <CardDescription>Guests arriving in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUpcoming ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="space-y-6">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Key className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{booking.guestName}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {booking.propertyName} • {format(parseISO(booking.startDate), 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <Link href={`/bookings/${booking.id}`}>
                      <Button variant="ghost" size="icon">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center text-center">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">No upcoming check-ins</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
         <Card>
          <CardHeader>
            <CardTitle>Revenue by Source</CardTitle>
            <CardDescription>Distribution of booking channels</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full">
            {loadingRevenue ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueStats || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => `€${val}`} />
                  <YAxis dataKey="source" type="category" axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [`€${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar 
                    dataKey="revenue" 
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  >
                    {revenueStats?.map((entry, index) => {
                      let color = 'hsl(var(--chart-5))';
                      if (entry.source === 'Direct') color = 'hsl(var(--chart-1))';
                      if (entry.source === 'Airbnb') color = 'hsl(var(--chart-3))';
                      if (entry.source === 'Booking.com') color = 'hsl(var(--chart-4))';
                      if (entry.source === 'VRBO') color = 'hsl(var(--chart-2))';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
