import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, UserPlus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function WalkInsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [wait, setWait] = useState("15");

  const { data: walkins = [], isLoading } = useQuery({
    queryKey: ["walk_ins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("walk_ins")
        .select("*, service:services(name, price), barber:barbers(id, name)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, name, price").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const addWalkin = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("walk_ins").insert({
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        service_id: serviceId || null,
        estimated_wait_minutes: parseInt(wait) || 15,
        status: "waiting",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Walk-in added");
      setName(""); setPhone(""); setServiceId(""); setWait("15");
      qc.invalidateQueries({ queryKey: ["walk_ins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateWalkin = useMutation({
    mutationFn: async (vars: { id: string; patch: any }) => {
      const { error } = await supabase.from("walk_ins").update(vars.patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["walk_ins"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const active = walkins.filter((w) => w.status === "waiting" || w.status === "in_progress");
  const totalRevenue = active.reduce((s, w) => s + Number(w.service?.price ?? 0), 0);
  const avgWait = active.length
    ? Math.round(active.reduce((s, w) => s + w.estimated_wait_minutes, 0) / active.length)
    : 0;

  const stats = [
    { label: "In Queue", value: active.length },
    { label: "Unassigned", value: active.filter((w) => !w.barber_id).length },
    { label: "Avg. Wait", value: `${avgWait} min` },
    { label: "Est. Revenue", value: `₱${totalRevenue.toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Walk-ins" subtitle="Live walk-in queue" />

      {/* Add walk-in moved to TOP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add walk-in customer</CardTitle>
          <CardDescription>Quickly register a new customer for the queue</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); addWalkin.mutate(); }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="wi-name">Customer name *</Label>
              <Input id="wi-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wi-phone">Phone</Label>
              <Input id="wi-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 …" />
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Pick a service" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — ₱{Number(s.price).toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wi-wait">Est. wait (min)</Label>
              <Input id="wi-wait" type="number" min={0} value={wait} onChange={(e) => setWait(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={addWalkin.isPending}>
                {addWalkin.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Add to queue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
          <CardDescription>Assign waiting customers and update status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && active.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Queue is empty — add a walk-in above.
            </p>
          )}
          {active.map((w) => (
            <div key={w.id} className="grid grid-cols-1 items-center gap-3 rounded-lg border p-3 md:flex md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback>{w.customer_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{w.customer_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.service?.name ?? "No service"} {w.service?.price ? `· ₱${Number(w.service.price).toLocaleString()}` : ""}
                    {w.customer_phone ? ` · ${w.customer_phone}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant={w.status === "in_progress" ? "default" : "outline"} className="gap-1">
                  <Clock className="h-3 w-3" /> {w.estimated_wait_minutes} min
                </Badge>
                <Select
                  value={w.barber_id ?? ""}
                  onValueChange={(v) => updateWalkin.mutate({ id: w.id, patch: { barber_id: v, status: "in_progress" } })}
                >
                  <SelectTrigger className="w-44"><SelectValue placeholder="Assign barber" /></SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateWalkin.mutate({ id: w.id, patch: { status: "completed" } })}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Done
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateWalkin.mutate({ id: w.id, patch: { status: "cancelled" } })}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
