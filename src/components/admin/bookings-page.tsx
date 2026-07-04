import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Star } from "lucide-react";
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

type Status = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

type Booking = {
  id: string; reference: string; customer_name: string; customer_phone: string | null;
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", barber_id: "", service_id: "",
    booking_date: today, start_time: "10:00", status: "pending" as Status, price: 0,
  });

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const submitReview = useMutation({
    pointer: "bookings",
    mutationFn: async (reviewPayload: {
      booking_id?: string;
      customer_name: string;
      service_name: string;
      rating: number;
      comment: string;
    }) => {
      const { error } = await supabase.from("reviews").insert(reviewPayload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review logged successfully!");
      setReviewDialogOpen(false);
      setSelectedBookingForReview(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, barber:barbers(name), service:services(name, price)")
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
      const payload = { ...form, barber_id: form.barber_id || null, service_id: form.service_id || null };
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
      if (editing && form.status === "completed" && editing.status !== "completed") {
        const bookingWithDetails = {
          id: editing.id,
          customer_name: form.customer_name,
          service: services.find((s) => s.id === form.service_id),
        };
        setSelectedBookingForReview(bookingWithDetails);
        setReviewRating(5);
        setReviewComment("");
        setReviewDialogOpen(true);
      }
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
      barber_id: b.barber_id ?? "", service_id: b.service_id ?? "",
      booking_date: b.booking_date, start_time: b.start_time.slice(0, 5), status: b.status, price: b.price,
    });
    setOpen(true);
  };
  const startNew = () => {
    setEditing(null);
    setForm({ customer_name: "", customer_phone: "", barber_id: "", service_id: "",
      booking_date: today, start_time: "10:00", status: "pending", price: 0 });
    setOpen(true);
  };

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.customer_name.toLowerCase().includes(q) || b.reference.toLowerCase().includes(q);
  });

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
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Customer name</Label>
                  <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5"><Label>Phone</Label>
                  <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Service</Label>
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
                <div className="space-y-1.5"><Label>Barber</Label>
                  <Select value={form.barber_id} onValueChange={(v) => setForm({ ...form, barber_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {barbers.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Date</Label>
                  <Input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Time</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Price (₱)</Label>
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
              <Input className="w-64" placeholder="Search by name or reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
              </SelectContent>
            </Select>
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
                        updateStatus.mutate({ id: b.id, status: v as Status });
                        if (v === "completed") {
                          setSelectedBookingForReview(b);
                          setReviewRating(5);
                          setReviewComment("");
                          setReviewDialogOpen(true);
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
                    <Button size="icon" variant="ghost" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) remove.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog Popup */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-2 border-black dark:border-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm font-black uppercase tracking-widest text-zinc-500">
              [ LOG CUSTOMER REVIEW ]
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Write a quick review on behalf of <strong>{selectedBookingForReview?.customer_name}</strong> for their <strong>{selectedBookingForReview?.service?.name || "Service"}</strong>.
            </p>
            
            <div className="space-y-2">
              <Label className="font-mono text-xs font-bold uppercase text-zinc-400">Rating</Label>
              <div className="flex gap-1 justify-center my-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setReviewRating(num)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        num <= reviewRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-200 dark:text-zinc-800"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs font-bold uppercase text-zinc-400">Comments</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="What did they think of their new look? (optional)"
                rows={3}
                className="rounded-xl border-zinc-350 dark:border-zinc-800 focus-visible:ring-black dark:focus-visible:ring-white"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} className="rounded-full font-mono text-xs uppercase tracking-widest">
              Skip
            </Button>
            <Button
              disabled={submitReview.isPending}
              onClick={() => {
                submitReview.mutate({
                  booking_id: selectedBookingForReview?.id,
                  customer_name: selectedBookingForReview?.customer_name || "Guest",
                  service_name: selectedBookingForReview?.service?.name || "Service",
                  rating: reviewRating,
                  comment: reviewComment,
                });
              }}
              className="rounded-full bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest px-6"
            >
              {submitReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}