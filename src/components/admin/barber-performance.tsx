import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";

import { formatPHP, mockBarberPerformance } from "@/lib/mock-data";

export function BarberPerformance() {
  const max = Math.max(...mockBarberPerformance.map((b) => b.bookings_count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Barber Performance</CardTitle>
        <CardDescription>Bookings and revenue this month</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {mockBarberPerformance.map((b) => {
          const initials = b.barber_name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2);
          return (
            <div key={b.barber_id} className="space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{b.barber_name}</p>
                    <span className="shrink-0 text-sm font-semibold">{formatPHP(b.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{b.bookings_count} bookings</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {b.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
              <Progress value={(b.bookings_count / max) * 100} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}