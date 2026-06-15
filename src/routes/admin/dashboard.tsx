import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashboardHeader } from "@/components/admin/dashboard-header";
import { BookingStatusBadge } from "@/components/admin/booking-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard · Sharp & Co." },
      { name: "description", content: "Overview of bookings, revenue and barber performance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: bookings = [] } = useQuery({
    queryKey: ["dashboard-bookings"],
    queryFn: async () =>
      (await supabase.from("bookings").select("*, barber:barbers(name), service:services(name)").order("booking_date", { ascending: false }).order("start_time")).data ?? [],
  });
  const { data: walkins = [] } = useQuery({
    queryKey: ["dashboard-walkins"],
    queryFn: async () => (await supabase.from("walk_ins").select("id, status").eq("status", "waiting")).data ?? [],
  });

  const todays = bookings.filter((b: any) => b.booking_date === today);
  const revenue = bookings.filter((b: any) => b.status === "completed").reduce((s, b: any) => s + Number(b.price), 0);
  const upcoming = bookings.filter((b: any) => b.booking_date >= today).slice(0, 6);
  const recent = bookings.filter((b: any) => b.booking_date < today).slice(0, 6);

  const stats = [
    { label: "Today's bookings", value: todays.length },
    { label: "Total bookings", value: bookings.length },
    { label: "Walk-ins waiting", value: walkins.length },
    { label: "Revenue (completed)", value: `₱${revenue.toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Dashboard" subtitle="Live overview from your database" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {[
        { title: "Upcoming bookings", rows: upcoming },
        { title: "Recent bookings", rows: recent },
      ].map(({ title, rows }) => (
        <Card key={title}>
          <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Customer</TableHead><TableHead>Service</TableHead><TableHead>Barber</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No bookings.</TableCell></TableRow>}
                {rows.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.reference}</TableCell>
                    <TableCell>{b.customer_name}</TableCell>
                    <TableCell>{b.service?.name ?? "—"}</TableCell>
                    <TableCell>{b.barber?.name ?? "—"}</TableCell>
                    <TableCell>{b.booking_date}</TableCell>
                    <TableCell>{b.start_time.slice(0, 5)}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                    <TableCell>₱{Number(b.price).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}