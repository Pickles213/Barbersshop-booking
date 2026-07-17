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

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", "all"],
    queryFn: async () => (await supabase.from("payments").select("*")).data ?? [],
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["commissions", "all"],
    queryFn: async () => (await supabase.from("barber_commissions").select("*, barber:barbers(name)")).data ?? [],
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

  const filteredPayments = payments.filter((p: any) => {
    if (dateFilter === "all") return true;
    const pDate = new Date(p.created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDateStr = p.created_at.split("T")[0];
    if (dateFilter === "today") {
      const todayStr = today.toISOString().split("T")[0];
      return checkDateStr === todayStr;
    }
    if (dateFilter === "7") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return pDate >= sevenDaysAgo;
    }
    if (dateFilter === "30") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return pDate >= thirtyDaysAgo;
    }
    if (dateFilter === "this-month") {
      return pDate.getMonth() === today.getMonth() && pDate.getFullYear() === today.getFullYear();
    }
    if (dateFilter === "last-month") {
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      return pDate.getMonth() === lastMonth.getMonth() && pDate.getFullYear() === lastMonth.getFullYear();
    }
    return true;
  });

  const filteredCommissions = commissions.filter((c: any) => {
    if (dateFilter === "all") return true;
    const cDate = new Date(c.created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDateStr = c.created_at.split("T")[0];
    if (dateFilter === "today") {
      const todayStr = today.toISOString().split("T")[0];
      return checkDateStr === todayStr;
    }
    if (dateFilter === "7") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return cDate >= sevenDaysAgo;
    }
    if (dateFilter === "30") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return cDate >= thirtyDaysAgo;
    }
    if (dateFilter === "this-month") {
      return cDate.getMonth() === today.getMonth() && cDate.getFullYear() === today.getFullYear();
    }
    if (dateFilter === "last-month") {
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      return cDate.getMonth() === lastMonth.getMonth() && cDate.getFullYear() === lastMonth.getFullYear();
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

  // 4) Revenue by Payment Method (POS Payments)
  const byPaymentMethod = Object.values(filteredPayments.reduce<Record<string, { name: string; value: number }>>((acc, p: any) => {
    const method = p.payment_method.toUpperCase();
    if (!acc[method]) acc[method] = { name: method, value: 0 };
    acc[method].value += Number(p.amount);
    return acc;
  }, {}));

  // 5) Barber Commissions/Performance
  const byBarberPayroll = Object.values(filteredCommissions.reduce<Record<string, { name: string; services: number; gross: number; commission: number; shopShare: number }>>((acc, c: any) => {
    const name = c.barber?.name || "Unknown Barber";
    if (!acc[name]) acc[name] = { name, services: 0, gross: 0, commission: 0, shopShare: 0 };
    acc[name].services += 1;
    acc[name].gross += Number(c.gross_amount);
    acc[name].commission += Number(c.commission_amount);
    acc[name].shopShare += Number(c.gross_amount) - Number(c.commission_amount);
    return acc;
  }, {}));

  // 6) Revenue Trend (daily POS payments)
  const trendData = Object.values(
    filteredPayments.reduce<Record<string, { date: string; formattedDate: string; revenue: number; transactions: number }>>((acc, p: any) => {
      const dateStr = p.created_at.split("T")[0];
      if (!acc[dateStr]) {
        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        acc[dateStr] = { date: dateStr, formattedDate, revenue: 0, transactions: 0 };
      }
      acc[dateStr].revenue += Number(p.amount);
      acc[dateStr].transactions += 1;
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));

  const totalBookings = filteredBookings.length;
  const totalRevenue = filteredPayments.reduce((s, p: any) => s + Number(p.amount), 0);
  const totalCommissions = filteredCommissions.reduce((s, c: any) => s + Number(c.commission_amount), 0);
  const netShopProfit = totalRevenue - totalCommissions;

  const cancelledBookings = filteredBookings.filter((b: any) => b.status === "cancelled").length;
  const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Reports" 
        subtitle="POS transactions and barber payroll metrics" 
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
            <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Total Sales (Gross)</p>
            <p className="mt-1.5 text-3xl font-black tracking-tight text-indigo-650 dark:text-indigo-400">₱{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Barber Commissions</p>
            <p className="mt-1.5 text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">₱{totalCommissions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Net Shop Profit</p>
            <p className="mt-1.5 text-3xl font-black tracking-tight text-emerald-650 dark:text-emerald-400">₱{netShopProfit.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Bookings Count</p>
            <p className="mt-1.5 text-3xl font-black tracking-tight">{totalBookings} <span className="text-xs text-muted-foreground font-normal">({cancellationRate.toFixed(0)}% cancel)</span></p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Trend Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Revenue Trend (POS Payments)</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 350 }}>
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No transaction data for this time period</div>
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
                    formatter={(value) => [`₱${Number(value).toLocaleString()}`, "Gross Payments"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Sales by Payment Method</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 300 }}>
            {byPaymentMethod.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No checkout transactions for this period</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byPaymentMethod} dataKey="value" nameKey="name" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {byPaymentMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Bookings Status Allocation</CardTitle>
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

        {/* Barber Payroll & Commission Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Barber Payroll &amp; Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            {byBarberPayroll.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No commission data logged for this period</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barber</TableHead>
                    <TableHead className="text-center">Services Done</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                    <TableHead className="text-right">Commissions Payout</TableHead>
                    <TableHead className="text-right">Shop Share (Profit)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byBarberPayroll.map((b) => (
                    <TableRow key={b.name}>
                      <TableCell className="font-bold">{b.name}</TableCell>
                      <TableCell className="text-center font-medium">{b.services}</TableCell>
                      <TableCell className="text-right font-semibold">₱{b.gross.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-amber-600 dark:text-amber-400 font-bold">₱{b.commission.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold">₱{b.shopShare.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
