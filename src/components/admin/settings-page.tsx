import { useState } from "react";
import { CalendarDays, CreditCard, Plus, Store, Trash2 } from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function SettingsPage() {
  const [hours, setHours] = useState(
    days.map((d) => ({ day: d, open: "09:00", close: d === "Sunday" ? "17:00" : "20:00", closed: d === "Sunday" })),
  );
  const [methods, setMethods] = useState({ cash: true, gcash: true, paymaya: true, card: false });
  const [holidays, setHolidays] = useState([
    { id: "h1", name: "Independence Day", date: "2026-06-12" },
    { id: "h2", name: "Ninoy Aquino Day", date: "2026-08-21" },
    { id: "h3", name: "Christmas Day", date: "2026-12-25" },
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeader title="Settings" subtitle="Shop preferences and configuration" showActions={false} />

      <Tabs defaultValue="shop">
        <TabsList>
          <TabsTrigger value="shop"><Store className="mr-2 h-4 w-4" />Shop</TabsTrigger>
          <TabsTrigger value="hours"><CalendarDays className="mr-2 h-4 w-4" />Hours</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="mr-2 h-4 w-4" />Payments</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
              <CardDescription>Public details shown to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Shop name</Label>
                  <Input id="name" defaultValue="Sharp & Co. Barbershop" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact number</Label>
                  <Input id="phone" defaultValue="+63 917 555 0142" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="hello@sharpandco.ph" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" defaultValue="2F Ayala Center, Makati City" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="about">About</Label>
                <Textarea id="about" rows={3} defaultValue="A modern barbershop blending classic craft with a relaxed lounge atmosphere." />
              </div>
              <Button>Save changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
              <CardDescription>Default weekly schedule for the shop</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hours.map((h, i) => (
                <div key={h.day} className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-3 rounded-lg border p-3">
                  <span className="font-medium">{h.day}</span>
                  <Input
                    type="time"
                    value={h.open}
                    disabled={h.closed}
                    onChange={(e) =>
                      setHours((p) => p.map((x, idx) => (idx === i ? { ...x, open: e.target.value } : x)))
                    }
                  />
                  <Input
                    type="time"
                    value={h.close}
                    disabled={h.closed}
                    onChange={(e) =>
                      setHours((p) => p.map((x, idx) => (idx === i ? { ...x, close: e.target.value } : x)))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!h.closed}
                      onCheckedChange={(v) =>
                        setHours((p) => p.map((x, idx) => (idx === i ? { ...x, closed: !v } : x)))
                      }
                    />
                    <span className="text-xs text-muted-foreground">{h.closed ? "Closed" : "Open"}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Enable how customers can pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(methods).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium capitalize">{k}</p>
                    <p className="text-xs text-muted-foreground">
                      {k === "cash" && "Pay in store with cash"}
                      {k === "gcash" && "Mobile wallet via GCash"}
                      {k === "paymaya" && "Mobile wallet via Maya"}
                      {k === "card" && "Credit and debit cards"}
                    </p>
                  </div>
                  <Switch
                    checked={v}
                    onCheckedChange={(checked) =>
                      setMethods((p) => ({ ...p, [k]: checked }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Holidays</CardTitle>
                <CardDescription>Days when the shop is closed</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add holiday</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Closed</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setHolidays((p) => p.filter((x) => x.id !== h.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}