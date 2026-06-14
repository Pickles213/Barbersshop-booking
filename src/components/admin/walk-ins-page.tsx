import { useState } from "react";
import { Clock, UserPlus } from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockBarbers, formatPHP } from "@/lib/mock-data";

interface Walk {
  id: string;
  name: string;
  service: string;
  price: number;
  waiting_since: string;
  est_wait: number;
  assigned: string | null;
}

const seed: Walk[] = [
  { id: "w1", name: "Carlo Reyes", service: "Classic Fade", price: 450, waiting_since: "10:42", est_wait: 5, assigned: "Marco Reyes" },
  { id: "w2", name: "Jin Park", service: "Beard Trim", price: 250, waiting_since: "10:55", est_wait: 15, assigned: null },
  { id: "w3", name: "Mark Dela Cruz", service: "Hot Towel Shave", price: 600, waiting_since: "11:02", est_wait: 25, assigned: "Eli Mendoza" },
  { id: "w4", name: "Theo Lim", service: "Kids Cut", price: 300, waiting_since: "11:10", est_wait: 30, assigned: null },
];

export function WalkInsPage() {
  const [queue, setQueue] = useState<Walk[]>(seed);

  const assign = (id: string, barber: string) =>
    setQueue((p) => p.map((w) => (w.id === id ? { ...w, assigned: barber } : w)));

  const stats = [
    { label: "In Queue", value: queue.length },
    { label: "Unassigned", value: queue.filter((w) => !w.assigned).length },
    { label: "Avg. Wait", value: `${Math.round(queue.reduce((s, w) => s + w.est_wait, 0) / queue.length)} min` },
    { label: "Est. Revenue", value: formatPHP(queue.reduce((s, w) => s + w.price, 0)) },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Walk-ins" subtitle="Live walk-in queue" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current queue</CardTitle>
          <CardDescription>Assign waiting customers to an available barber</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.map((w) => (
            <div key={w.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 sm:flex sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback>{w.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{w.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{w.service} · {formatPHP(w.price)}</p>
                </div>
              </div>
              <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 sm:col-span-1">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" /> {w.est_wait} min
                </Badge>
                <span className="hidden text-xs text-muted-foreground sm:inline">since {w.waiting_since}</span>
                <Select value={w.assigned ?? ""} onValueChange={(v) => assign(w.id, v)}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Assign barber" /></SelectTrigger>
                  <SelectContent>
                    {mockBarbers.filter((b) => b.is_active).map((b) => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            Add walk-in customer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}