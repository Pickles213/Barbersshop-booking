import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import { BookingStatusBadge } from "./booking-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPHP, mockRecent, mockUpcoming } from "@/lib/mock-data";
import type { BookingStatus } from "@/types/db";

const all = [...mockUpcoming, ...mockRecent];

export function BookingsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(
    () =>
      all.filter(
        (b) =>
          (status === "all" || b.status === status) &&
          (b.client_name.toLowerCase().includes(q.toLowerCase()) ||
            b.booking_reference.toLowerCase().includes(q.toLowerCase()) ||
            b.barber_name.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, status],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const counts = {
    all: all.length,
    confirmed: all.filter((b) => b.status === "confirmed").length,
    pending: all.filter((b) => b.status === "pending").length,
    completed: all.filter((b) => b.status === "completed").length,
    cancelled: all.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Bookings" subtitle="All appointments across the shop" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(counts).map(([k, v]) => (
          <Card key={k}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search client, reference, barber"
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v as BookingStatus | "all"); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Barber</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.booking_reference}</TableCell>
                    <TableCell className="font-medium">{b.client_name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.service_name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.barber_name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.appointment_date}</TableCell>
                    <TableCell className="text-muted-foreground">{b.start_time}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                    <TableCell className="text-right font-medium">{formatPHP(b.price)}</TableCell>
                  </TableRow>
                ))}
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No bookings match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
            <span>
              Showing {visible.length} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span>Page {page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}