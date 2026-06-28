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
import { formatPHP } from "@/lib/mock-data";
import type { UpcomingBookingRow } from "@/types/db";

import { BookingStatusBadge } from "./booking-status-badge";

interface Props {
  rows: UpcomingBookingRow[];
}

export function RecentBookingsTable({ rows }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
        <CardDescription>Latest activity from the past 24 hours</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Barber</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.service_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.barber_name}</TableCell>
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