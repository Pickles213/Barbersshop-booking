import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const COLORS = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#06b6d4", "#a855f7"];

export function ReportsPage() {
  const [dateFilter, setDateFilter] = useState("30");

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", "all"],
    queryFn: async () => (await supabase.from("bookings").select("*, service:services(name, category), barber:barbers(name)")).data ?? [],
  });

  const filteredBookings = bookings.filter((b: any) => {
    if (dateFilter === "all") return true;
    
    const bDate = new Date(b.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === "today") {
      const todayStr = today.toISOString().split("T")[0];
      return b.booking_date === todayStr;
    }
    
    if (dateFilter === "7") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return bDate >= sevenDaysAgo;
    }
    
    if (dateFilter === "30") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return bDate >= thirtyDaysAgo;
    }

    if (dateFilter === "this-month") {
      return bDate.getMonth() === today.getMonth() && bDate.getFullYear() === today.getFullYear();
    }
    
    if (dateFilter === "last-month") {
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      return bDate.getMonth() === lastMonth.getMonth() && bDate.getFullYear() === lastMonth.getFullYear();
    }
    
    return true;
  });

  // 1) Revenue by Service
  const byService = Object.values(filteredBookings.reduce<Record<string, { name: string; revenue: number }>>((acc, b: any) => {
    const name = b.service?.name ?? "—";
    if (!acc[name]) acc[name] = { name, revenue: 0 };
    acc[name].revenue += Number(b.price);
    return acc;
  }, {}));

  // 2) Revenue by Category
  const byCategory = Object.values(filteredBookings.reduce<Record<string, { name: string; revenue: number }>>((acc, b: any) => {
    const category = b.service?.category || "Other";
    if (!acc[category]) acc[category] = { name: category, revenue: 0 };
    acc[category].revenue += Number(b.price);
    return acc;
  }, {}));

  // 3) Bookings by Status
  const byStatus = Object.values(filteredBookings.reduce<Record<string, { name: string; value: number }>>((acc, b: any) => {
    if (!acc[b.status]) acc[b.status] = { name: b.status, value: 0 };
    acc[b.status].value += 1;
    return acc;
  }, {}));

  // 4) Barber Performance Summary
  const byBarber = Object.values(filteredBookings.reduce<Record<string, { name: string; bookings: number; revenue: number; completed: number; cancelled: number }>>((acc, b: any) => {
    const name = b.barber?.name ?? "Any Barber";
    if (!acc[name]) acc[name] = { name, bookings: 0, revenue: 0, completed: 0, cancelled: 0 };
    acc[name].bookings += 1;
    acc[name].revenue += Number(b.price);
    if (b.status === "completed") acc[name].completed += 1;
    if (b.status === "cancelled") acc[name].cancelled += 1;
    return acc;
  }, {}));

  // 5) Revenue Trend (daily)
  const trendData = Object.values(
    filteredBookings.reduce<Record<string, { date: string; formattedDate: string; revenue: number; bookings: number }>>((acc, b: any) => {
      const dateStr = b.booking_date;
      if (!acc[dateStr]) {
        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        acc[dateStr] = { date: dateStr, formattedDate, revenue: 0, bookings: 0 };
      }
      acc[dateStr].revenue += Number(b.price);
      acc[dateStr].bookings += 1;
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));

  const totalBookings = filteredBookings.length;
  const totalRevenue = filteredBookings.reduce((s, b: any) => s + Number(b.price), 0);
  const completedBookings = filteredBookings.filter((b: any) => b.status === "completed").length;
  const cancelledBookings = filteredBookings.filter((b: any) => b.status === "cancelled").length;
  
  const abv = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Reports" 
        subtitle="Performance insights from your bookings" 
        actions={
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Total Bookings</p>
            <p className="mt-1.5 text-3xl font-black tracking-tight">{totalBookings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Total Revenue</p>
            <p className="mt-1.5 text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">₱{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Average Booking Value (ABV)</p>
            <p className="mt-1.5 text-3xl font-black tracking-tight">₱{Math.round(abv).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Cancellation Rate</p>
            <p className="mt-1.5 text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">{cancellationRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Trend Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 350 }}>
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data for this time period</div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="formattedDate" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val}`} />
                  <Tooltip 
                    contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value) => [`₱${Number(value).toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Service Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 300 }}>
            {byCategory.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data for this time period</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="revenue" nameKey="name" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bookings by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Bookings by Status</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 300 }}>
            {byStatus.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data for this time period</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                    {byStatus.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Specific Service */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Revenue by Service Menu Item</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 300 }}>
            {byService.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data for this time period</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={byService}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Detailed Barber Performance Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Detailed Barber Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {byBarber.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No data for this time period</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barber</TableHead>
                    <TableHead className="text-center">Total Bookings</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">Cancelled</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Average Ticket Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byBarber.map((b) => {
                    const avgTicket = b.bookings > 0 ? b.revenue / b.bookings : 0;
                    return (
                      <TableRow key={b.name}>
                        <TableCell className="font-bold">{b.name}</TableCell>
                        <TableCell className="text-center font-medium">{b.bookings}</TableCell>
                        <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{b.completed}</TableCell>
                        <TableCell className="text-center text-rose-600 dark:text-rose-400">{b.cancelled}</TableCell>
                        <TableCell className="text-right font-semibold">₱{b.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-indigo-600 dark:text-indigo-400">₱{Math.round(avgTicket).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
