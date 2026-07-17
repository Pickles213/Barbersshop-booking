import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Star, Receipt, CreditCard, ChevronsUpDown, Check } from "lucide-react";
import { BookingReceiptDialog } from "./booking-receipt-dialog";
import { CheckoutDialog } from "./checkout-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

import { DashboardHeader } from "./dashboard-header";
import { BookingStatusBadge } from "./booking-status-badge";
import { supabase } from "@/integrations/supabase/client";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

type Status = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

type Booking = {
  id: string; reference: string; customer_name: string; customer_phone: string | null;
  customer_email: string | null; user_id: string | null;
  barber_id: string | null; service_id: string | null; booking_date: string; start_time: string;
  status: Status; price: number;
  barber?: { name: string } | null;
  service?: { name: string; price: number } | null;
};

const STATUSES: Status[] = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

export function BookingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [barberFilter, setBarberFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const today = new Date().toLocaleDateString("sv-SE");
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "", user_id: "", barber_id: "", service_id: "",
    booking_date: today, start_time: "10:00", status: "pending" as Status, price: 0,
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



  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, barber:barbers(name), service:services(name, price), booking_services(*)")
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as Booking[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: async () => (await supabase.from("services").select("id, name, price").eq("is_active", true).order("name")).data ?? [],
  });
  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers", "active"],
    queryFn: async () => (await supabase.from("barbers").select("id, name").eq("is_active", true).order("name")).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = { 
        ...form, 
        barber_id: form.barber_id || null, 
        service_id: form.service_id || null,
        user_id: form.user_id || null,
        customer_email: form.customer_email || null,
        customer_phone: form.customer_phone || null
      };
      if (editing) {
        const { error } = await supabase.from("bookings").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bookings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Booking updated" : "Booking created");
      setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Booking deleted"); qc.invalidateQueries({ queryKey: ["bookings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (v: { id: string; status: Status }) => {
      const { error } = await supabase.from("bookings").update({ status: v.status }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const startEdit = (b: Booking) => {
    setEditing(b);
    setForm({
      customer_name: b.customer_name, customer_phone: b.customer_phone ?? "",
      customer_email: b.customer_email ?? "", user_id: b.user_id ?? "",
      barber_id: b.barber_id ?? "", service_id: b.service_id ?? "",
      booking_date: b.booking_date, start_time: b.start_time.slice(0, 5), status: b.status, price: b.price,
    });
    setOpen(true);
  };
  const startNew = () => {
    setEditing(null);
    setForm({ customer_name: "", customer_phone: "", customer_email: "", user_id: "", barber_id: "", service_id: "",
      booking_date: today, start_time: "10:00", status: "pending", price: 0 });
    setOpen(true);
  };

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (barberFilter !== "all" && b.barber_id !== barberFilter) return false;
    if (dateFrom && b.booking_date < dateFrom) return false;
    if (dateTo && b.booking_date > dateTo) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.customer_name.toLowerCase().includes(q) || b.reference.toLowerCase().includes(q);
  });

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setBarberFilter("all"); setDateFrom(""); setDateTo("");
  };
  const hasActiveFilters = search || statusFilter !== "all" || barberFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Bookings"
        subtitle="View, create and update appointments"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={startNew}><Plus className="mr-2 h-4 w-4" />New booking</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit booking" : "New booking"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 overflow-hidden">
                <div className="col-span-2 space-y-1.5 min-w-0">
                  <Label>Link registered customer profile</Label>
                  <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {form.customer_email ? `${form.customer_name} (${form.customer_email})` : "Search user account…"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by name, phone, email…" />
                        <CommandList>
                          <CommandEmpty>No matching customer.</CommandEmpty>
                          <CommandGroup>
                            {form.user_id && (
                              <CommandItem
                                value="__clear__"
                                onSelect={() => {
                                  setForm({ ...form, user_id: "", customer_email: "" });
                                  setCustomerPickerOpen(false);
                                }}
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
                                    setForm({
                                      ...form,
                                      customer_name: c.name,
                                      customer_phone: c.phone ?? form.customer_phone,
                                      customer_email: c.email ?? "",
                                      user_id: c.user_id ?? "",
                                    });
                                    setCustomerPickerOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", form.user_id === c.user_id ? "opacity-100" : "opacity-0")} />
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
                <div className="col-span-2 space-y-1.5 min-w-0"><Label>Customer name</Label>
                  <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5 min-w-0"><Label>Phone</Label>
                  <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                </div>
                <div className="space-y-1.5 min-w-0"><Label>Service</Label>
                  <Select value={form.service_id} onValueChange={(v) => {
                    const svc = services.find((s) => s.id === v);
                    setForm({ ...form, service_id: v, price: svc ? Number(svc.price) : form.price });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0"><Label>Barber</Label>
                  <Select value={form.barber_id} onValueChange={(v) => setForm({ ...form, barber_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {barbers.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0"><Label>Date</Label>
                  <Input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
                </div>
                <div className="space-y-1.5 min-w-0"><Label>Time</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="space-y-1.5 min-w-0"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0"><Label>Price (₱)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => upsert.mutate()} disabled={!form.customer_name.trim() || upsert.isPending}>{editing ? "Save" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-medium">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input className="w-56" placeholder="Search by name or reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={barberFilter} onValueChange={setBarberFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All barbers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All barbers</SelectItem>
                {barbers.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">From</span>
              <Input type="date" className="w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" className="w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                Clear filters
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Barber</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No bookings.</TableCell></TableRow>
              )}
              {filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.reference}</TableCell>
                  <TableCell>
                    <div className="font-medium">{b.customer_name}</div>
                    {b.customer_phone && <div className="text-xs text-muted-foreground">{b.customer_phone}</div>}
                  </TableCell>
                  <TableCell>{b.service?.name ?? "—"}</TableCell>
                  <TableCell>{b.barber?.name ?? "—"}</TableCell>
                  <TableCell>{b.booking_date}</TableCell>
                  <TableCell>{formatTime(b.start_time.slice(0, 5))}</TableCell>
                  <TableCell>
                    <Select
                      value={b.status}
                      onValueChange={(v) => {
                        if (v === "completed") {
                          setCheckoutBooking(b);
                          setCheckoutOpen(true);
                        } else {
                          updateStatus.mutate({ id: b.id, status: v as Status });
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-32 border-0 p-0 [&>svg]:hidden">
                        <BookingStatusBadge status={b.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>₱{Number(b.price).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {b.status !== "completed" && b.status !== "cancelled" && b.status !== "no_show" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        onClick={() => {
                          setCheckoutBooking(b);
                          setCheckoutOpen(true);
                        }}
                        title="Checkout &amp; Bill"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setSelectedReceipt(b); setReceiptOpen(true); }} title="View Receipt"><Receipt className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) remove.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <BookingReceiptDialog 
        isOpen={receiptOpen} 
        onOpenChange={setReceiptOpen} 
        booking={selectedReceipt} 
      />
      <CheckoutDialog
        isOpen={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        bookingId={checkoutBooking?.id}
        customerName={checkoutBooking?.customer_name ?? ""}
        basePrice={checkoutBooking?.price ?? 0}
        barberId={checkoutBooking?.barber_id ?? null}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["bookings"] })}
      />
    </div>
  );
}