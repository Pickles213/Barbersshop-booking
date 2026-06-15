import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#06b6d4", "#a855f7"];

export function ReportsPage() {
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", "all"],
    queryFn: async () => (await supabase.from("bookings").select("*, service:services(name), barber:barbers(name)")).data ?? [],
  });

  const byService = Object.values(bookings.reduce<Record<string, { name: string; revenue: number }>>((acc, b: any) => {
    const name = b.service?.name ?? "—";
    if (!acc[name]) acc[name] = { name, revenue: 0 };
    acc[name].revenue += Number(b.price);
    return acc;
  }, {}));

  const byStatus = Object.values(bookings.reduce<Record<string, { name: string; value: number }>>((acc, b: any) => {
    if (!acc[b.status]) acc[b.status] = { name: b.status, value: 0 };
    acc[b.status].value += 1;
    return acc;
  }, {}));

  const byBarber = Object.values(bookings.reduce<Record<string, { name: string; bookings: number; revenue: number }>>((acc, b: any) => {
    const name = b.barber?.name ?? "—";
    if (!acc[name]) acc[name] = { name, bookings: 0, revenue: 0 };
    acc[name].bookings += 1;
    acc[name].revenue += Number(b.price);
    return acc;
  }, {}));

  const totalRevenue = bookings.reduce((s, b: any) => s + Number(b.price), 0);

  return (
    <div className="space-y-6">
      <DashboardHeader title="Reports" subtitle="Performance insights from your bookings" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Total Bookings</p><p className="mt-1 text-2xl font-bold">{bookings.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Total Revenue</p><p className="mt-1 text-2xl font-bold">₱{totalRevenue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-bold">{bookings.filter((b: any) => b.status === "completed").length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Cancelled</p><p className="mt-1 text-2xl font-bold">{bookings.filter((b: any) => b.status === "cancelled").length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue by service</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer><BarChart data={byService}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#6366f1" /></BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bookings by status</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer><PieChart><Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={100} label>{byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Barber performance</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer><BarChart data={byBarber}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="bookings" fill="#22c55e" /><Bar dataKey="revenue" fill="#6366f1" /></BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
