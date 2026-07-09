import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, CalendarDays, Footprints, Wallet, Receipt } from "lucide-react";
import { useState } from "react";

import { DashboardHeader } from "@/components/admin/dashboard-header";
import { BookingStatusBadge } from "@/components/admin/booking-status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatPHP } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { BookingReceiptDialog } from "@/components/admin/booking-receipt-dialog";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard · Southside Barbers" },
      { name: "description", content: "Overview of bookings, revenue and barber performance." },
    ],
  }),
  component: DashboardPage,
});

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function formatWhen(date: string, time?: string | null) {
  if (!date) return "—";
  const when = new Date(`${date}T${time ?? "00:00"}`);
  const datePart = when.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  if (!time) return datePart;
  const timePart = when.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

function DashboardPage() {
  const today = new Date().toLocaleDateString("sv-SE");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { data: bookings = [] } = useQuery({
    queryKey: ["dashboard-bookings"],
    queryFn: async () =>
      (await supabase.from("bookings").select("*, barber:barbers(name), service:services(name), booking_services(*)").order("booking_date", { ascending: false }).order("start_time", { ascending: true })).data ?? [],
  });
  const { data: walkins = [] } = useQuery({
    queryKey: ["dashboard-walkins"],
    queryFn: async () => (await supabase.from("walk_ins").select("id, status").eq("status", "waiting")).data ?? [],
  });

  const todays = bookings.filter((b: any) => b.booking_date === today);
  const revenue = bookings.filter((b: any) => b.status === "completed").reduce((s, b: any) => s + Number(b.price), 0);
  const upcoming = bookings
    .filter((b: any) => b.booking_date >= today)
    .sort((a: any, b: any) => {
      const dateCompare = a.booking_date.localeCompare(b.booking_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.start_time ?? "").localeCompare(b.start_time ?? "");
    })
    .slice(0, 6);
  const recent = bookings.filter((b: any) => b.booking_date < today).slice(0, 6);

  const tables = [
    { title: "Upcoming bookings", rows: upcoming, emptyLabel: "Nothing on the schedule yet." },
    { title: "Recent bookings", rows: recent, emptyLabel: "No bookings yet." },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Dashboard" subtitle="Here's what's happening at Southside Barbers today" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's bookings"
          value={todays.length}
          hint={todays.length === 0 ? "Nothing booked for today yet" : "Scheduled for today"}
          icon={CalendarCheck2}
          accent="primary"
        />
        <StatCard
          label="Total bookings"
          value={bookings.length}
          hint="All time"
          icon={CalendarDays}
          accent="primary"
        />
        <StatCard
          label="Walk-ins waiting"
          value={walkins.length}
          hint={walkins.length > 0 ? "Customer needs attention" : "No one waiting"}
          icon={Footprints}
          accent={walkins.length > 0 ? "amber" : "primary"}
        />
        <StatCard
          label="Revenue earned"
          value={formatPHP(revenue)}
          hint="From completed services"
          icon={Wallet}
          accent="emerald"
        />
      </div>

      {tables.map(({ title, rows, emptyLabel }) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {emptyLabel}
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((b: any) => (
                    <TableRow key={b.id} title={`Booking ref ${b.reference}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-500/10 text-xs font-medium text-sky-600">
                            {initials(b.customer_name)}
                          </div>
                          <span className="font-medium">{b.customer_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{b.service?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">with {b.barber?.name ?? "—"}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatWhen(b.booking_date, b.start_time)}
                      </TableCell>
                      <TableCell>
                        <BookingStatusBadge status={b.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatPHP(Number(b.price))}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => { setSelectedReceipt(b); setReceiptOpen(true); }} className="h-7 w-7" title="View Receipt">
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
      <BookingReceiptDialog 
        isOpen={receiptOpen} 
        onOpenChange={setReceiptOpen} 
        booking={selectedReceipt} 
      />
    </div>
  );
}
