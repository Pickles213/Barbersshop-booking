import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/mock-data";
import type { UpcomingBookingRow } from "@/types/db";

import { BookingStatusBadge } from "./booking-status-badge";

interface Props {
  rows: UpcomingBookingRow[];
}

export function UpcomingBookingsTable({ rows }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Next bookings on the schedule</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="shrink-0">
          View all
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Barber</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.booking_reference}</TableCell>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.service_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.barber_name}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.start_time}</TableCell>
                  <TableCell>
                    <BookingStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPHP(r.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}