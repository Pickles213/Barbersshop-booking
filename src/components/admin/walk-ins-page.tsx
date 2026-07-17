import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, UserPlus, CheckCircle2, XCircle, Loader2, Search, Radio, Scissors, Star, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckoutDialog } from "./checkout-dialog";

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
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalkInsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [linkedCustomer, setLinkedCustomer] = useState<{
    name: string; phone: string | null; email: string | null; user_id: string | null;
  } | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [barberId, setBarberId] = useState<string>("");
  const [checkoutWalkin, setCheckoutWalkin] = useState<any | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);



  const { data: walkins = [], isLoading } = useQuery({
    queryKey: ["walk_ins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("walk_ins")
        .select("*, service:services(name, price, duration_minutes), barber:barbers(id, name)")
        .order("queue_number", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin_walk_ins_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "walk_ins" },
        () => qc.invalidateQueries({ queryKey: ["walk_ins"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

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

  const { data: existingCustomers = [] } = useQuery({
    queryKey: ["existing_customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .order("full_name", { ascending: true })
        .limit(500);
      if (error) throw error;
      const seen = new Map<string, { name: string; phone: string | null; email: string | null; user_id: string | null }>();
      for (const r of data ?? []) {
        const key = (r.id ?? r.email ?? r.phone ?? r.full_name ?? "").toString().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.set(key, {
          name: r.full_name ?? r.email ?? "Unnamed",
          phone: r.phone,
          email: r.email,
          user_id: r.id,
        });
      }
      return Array.from(seen.values());
    },
  });

  const addWalkin = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("walk_ins").insert({
        customer_name: name.trim(),
        customer_phone: linkedCustomer?.phone ?? null,
        customer_email: linkedCustomer?.email ?? null,
        user_id: linkedCustomer?.user_id ?? null,
        service_id: serviceId || null,
        barber_id: barberId && barberId !== "none" ? barberId : null,
        estimated_wait_minutes: 15,
        status: "waiting",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Walk-in added");
      setName(""); setServiceId(""); setLinkedCustomer(null); setBarberId("");
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

  const getWaitTimes = (
    waitingList: typeof walkins,
    inProgressList: typeof walkins,
    bCount: number
  ) => {
    const servers = Array(Math.max(1, bCount)).fill(0);
    for (let i = 0; i < Math.min(servers.length, inProgressList.length); i++) {
      servers[i] = inProgressList[i].service?.duration_minutes ?? 30;
    }

    const waitTimesMap: Record<string, number> = {};

    for (const r of waitingList) {
      let minIdx = 0;
      for (let i = 1; i < servers.length; i++) {
        if (servers[i] < servers[minIdx]) {
          minIdx = i;
        }
      }
      waitTimesMap[r.id] = servers[minIdx];
      servers[minIdx] += r.service?.duration_minutes ?? 30;
    }

    return waitTimesMap;
  };

  const waitingCustomers = active.filter((w) => w.status === "waiting");
  const inProgressCustomers = active.filter((w) => w.status === "in_progress");
  const barberCount = Math.max(1, barbers.length);
  const waitTimesMap = getWaitTimes(waitingCustomers, inProgressCustomers, barberCount);

  const getDynamicWaitMinutes = (w: typeof walkins[number]) => {
    if (w.status === "in_progress") return 0;
    return waitTimesMap[w.id] ?? 0;
  };

  const avgWait = waitingCustomers.length
    ? Math.round(waitingCustomers.reduce((sum, w) => sum + getDynamicWaitMinutes(w), 0) / waitingCustomers.length)
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
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="wi-name">Customer name *</Label>
              <Input id="wi-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wi-barber">Prefer barber</Label>
              <Select value={barberId} onValueChange={setBarberId}>
                <SelectTrigger id="wi-barber">
                  <SelectValue placeholder="Pick a barber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Link existing customer</Label>
              <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {linkedCustomer ? linkedCustomer.name : "Search customer…"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name, phone, email…" />
                    <CommandList>
                      <CommandEmpty>No matching customer.</CommandEmpty>
                      <CommandGroup>
                        {linkedCustomer && (
                          <CommandItem
                            value="__clear__"
                            onSelect={() => { setLinkedCustomer(null); setCustomerPickerOpen(false); }}
                          >
                            Clear selection (treat as guest)
                          </CommandItem>
                        )}
                        {existingCustomers.map((c, i) => {
                          const key = `${c.user_id ?? c.email ?? c.phone ?? c.name}-${i}`;
                          const searchValue = [c.name, c.email, c.phone].filter(Boolean).join(" ");
                          return (
                            <CommandItem
                              key={key}
                              value={searchValue}
                              onSelect={() => {
                                setLinkedCustomer(c);
                                setName(c.name);
                                setCustomerPickerOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", linkedCustomer?.name === c.name && linkedCustomer?.email === c.email ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="text-sm">{c.name}</span>
                                <span className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="w-full" disabled={addWalkin.isPending}>
                {addWalkin.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Add to queue
              </Button>
            </div>
          </form>
          {linkedCustomer && (
            <p className="mt-3 text-xs text-muted-foreground">
              Linked to account: <span className="font-medium text-foreground">{linkedCustomer.name}</span>
              {linkedCustomer.email ? ` · ${linkedCustomer.email}` : ""}
            </p>
          )}
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
          <CardTitle className="flex items-center gap-2">
            Current queue
            <Badge variant="outline" className="gap-1 font-normal">
              <Radio className="h-3 w-3 animate-pulse text-green-500" /> Live
            </Badge>
          </CardTitle>
          <CardDescription>Assign waiting customers and update status — updates in real time</CardDescription>
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
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-bold">
                    {w.queue_number != null ? `#${w.queue_number}` : "—"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {w.customer_name}
                    {w.user_id && <Badge variant="secondary" className="ml-2 text-[10px]">Account</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.service?.name ?? "No service"} {w.service?.price ? `· ₱${Number(w.service.price).toLocaleString()}` : ""}
                    {w.customer_email ? ` · ${w.customer_email}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant={w.status === "in_progress" ? "default" : "outline"} className="gap-1">
                  <Clock className="h-3 w-3" /> {w.status === "in_progress" ? "Serving" : `${getDynamicWaitMinutes(w)} min`}
                </Badge>
                <Select
                  value={w.barber_id ?? ""}
                  onValueChange={(v) => updateWalkin.mutate({ id: w.id, patch: { barber_id: v } })}
                >
                  <SelectTrigger className="w-44"><SelectValue placeholder="Assign barber" /></SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {w.status === "waiting" ? (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!w.barber_id}
                    onClick={() => updateWalkin.mutate({ id: w.id, patch: { status: "in_progress" } })}
                  >
                    <Scissors className="mr-1 h-4 w-4" /> Start
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/10"
                    onClick={() => {
                      setCheckoutWalkin(w);
                      setCheckoutOpen(true);
                    }}
                  >
                    <CreditCard className="mr-1.5 h-4 w-4" /> Checkout
                  </Button>
                )}
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
      <CheckoutDialog
        isOpen={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        walkInId={checkoutWalkin?.id}
        customerName={checkoutWalkin?.customer_name ?? ""}
        basePrice={checkoutWalkin?.service?.price ?? 0}
        barberId={checkoutWalkin?.barber_id ?? null}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["walk_ins"] })}
      />
    </div>
  );
}
