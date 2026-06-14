import { useState } from "react";
import { CalendarOff, Clock } from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockBarbers } from "@/lib/mock-data";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Shift = { start: string; end: string } | "off";

const schedules: Record<string, Shift[]> = {
  b1: [{ start: "09:00", end: "18:00" }, { start: "09:00", end: "18:00" }, "off", { start: "10:00", end: "19:00" }, { start: "10:00", end: "20:00" }, { start: "09:00", end: "20:00" }, { start: "10:00", end: "17:00" }],
  b2: [{ start: "10:00", end: "19:00" }, { start: "10:00", end: "19:00" }, { start: "10:00", end: "19:00" }, "off", { start: "10:00", end: "20:00" }, { start: "10:00", end: "20:00" }, "off"],
  b3: ["off", { start: "11:00", end: "20:00" }, { start: "11:00", end: "20:00" }, { start: "11:00", end: "20:00" }, { start: "11:00", end: "20:00" }, { start: "10:00", end: "20:00" }, { start: "10:00", end: "18:00" }],
  b4: [{ start: "09:00", end: "15:00" }, "off", { start: "09:00", end: "15:00" }, { start: "09:00", end: "15:00" }, "off", { start: "09:00", end: "18:00" }, { start: "09:00", end: "18:00" }],
};

const unavailability = [
  { barber: "Marco Reyes", start: "2026-06-20", end: "2026-06-22", reason: "Family vacation" },
  { barber: "Eli Mendoza", start: "2026-06-18", end: "2026-06-18", reason: "Medical appointment" },
];

export function SchedulesPage() {
  const [barber, setBarber] = useState<string>("all");
  const visible = barber === "all" ? mockBarbers : mockBarbers.filter((b) => b.id === barber);

  return (
    <div className="space-y-6">
      <DashboardHeader title="Schedules" subtitle="Weekly hours, breaks and time off" showActions={false} />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Showing</span>
        <Select value={barber} onValueChange={setBarber}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All barbers</SelectItem>
            {mockBarbers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {visible.map((b) => (
          <Card key={b.id}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <Avatar className="h-10 w-10"><AvatarFallback>{b.avatar_initials}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{b.name}</CardTitle>
                <CardDescription>{b.specialization}</CardDescription>
              </div>
              <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Off"}</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {days.map((d, i) => {
                  const shift = schedules[b.id]?.[i];
                  const off = shift === "off" || !shift;
                  return (
                    <div
                      key={d}
                      className={`rounded-lg border p-3 ${off ? "bg-muted/50" : "bg-background"}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</p>
                      {off ? (
                        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarOff className="h-3.5 w-3.5" /> Day off
                        </p>
                      ) : (
                        <p className="mt-2 flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {shift.start}–{shift.end}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming time off</CardTitle>
          <CardDescription>Scheduled unavailability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {unavailability.map((u, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{u.barber}</p>
                <p className="text-xs text-muted-foreground">{u.reason}</p>
              </div>
              <p className="text-sm text-muted-foreground">{u.start} → {u.end}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}