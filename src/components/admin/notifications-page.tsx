import { useState } from "react";
import { Bell, Calendar, CheckCheck, CircleAlert, Mail, UserPlus } from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Kind = "booking" | "cancel" | "user" | "system";

interface Item {
  id: string;
  kind: Kind;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const iconMap: Record<Kind, typeof Bell> = {
  booking: Calendar,
  cancel: CircleAlert,
  user: UserPlus,
  system: Bell,
};

const accentMap: Record<Kind, string> = {
  booking: "bg-primary/10 text-primary",
  cancel: "bg-rose-500/10 text-rose-500",
  user: "bg-emerald-500/10 text-emerald-500",
  system: "bg-amber-500/10 text-amber-500",
};

const seed: Item[] = [
  { id: "n1", kind: "booking", title: "New booking confirmed", message: "Daniel Cruz booked Classic Fade with Marco Reyes at 10:00.", time: "2m ago", read: false },
  { id: "n2", kind: "cancel", title: "Booking cancelled", message: "Leo Bautista cancelled Hair + Beard Combo (BK-10416).", time: "18m ago", read: false },
  { id: "n3", kind: "user", title: "New customer registered", message: "Jin Park created an account from the mobile app.", time: "1h ago", read: false },
  { id: "n4", kind: "booking", title: "Booking rescheduled", message: "Miguel Reyes moved his slot from 11:30 to 12:00.", time: "3h ago", read: true },
  { id: "n5", kind: "system", title: "Daily report ready", message: "Yesterday's summary is now available in Reports.", time: "Yesterday", read: true },
  { id: "n6", kind: "cancel", title: "No-show flagged", message: "Niko Flores did not arrive for an 11:00 appointment.", time: "Yesterday", read: true },
];

const emails = [
  { recipient: "daniel.cruz@email.com", subject: "Booking confirmation BK-10421", status: "delivered", sent: "10:02 AM" },
  { recipient: "anton.lim@email.com", subject: "Booking confirmation BK-10422", status: "delivered", sent: "09:51 AM" },
  { recipient: "leo.bautista@email.com", subject: "Cancellation notice BK-10416", status: "delivered", sent: "Yesterday" },
  { recipient: "niko.flores@email.com", subject: "We missed you yesterday", status: "bounced", sent: "Yesterday" },
];

export function NotificationsPage() {
  const [items, setItems] = useState<Item[]>(seed);
  const unread = items.filter((i) => !i.read).length;

  const markAll = () => setItems((p) => p.map((i) => ({ ...i, read: true })));
  const markOne = (id: string) => setItems((p) => p.map((i) => (i.id === id ? { ...i, read: true } : i)));

  return (
    <div className="space-y-6">
      <DashboardHeader title="Notifications" subtitle={`${unread} unread`} showActions={false} />

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="email">Email log</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>System events and booking updates</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={markAll} disabled={unread === 0}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((n) => {
                const Icon = iconMap[n.kind];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markOne(n.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${n.read ? "opacity-70" : ""}`}
                  >
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${accentMap[n.kind]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{n.title}</p>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{n.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email log</CardTitle>
              <CardDescription>Transactional emails sent in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {emails.map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.recipient}</p>
                  </div>
                  <Badge variant={e.status === "delivered" ? "default" : "destructive"}>{e.status}</Badge>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{e.sent}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}