import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Star, 
  Trash2, 
  Pencil, 
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Scissors,
  Loader2,
  Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";

import { DashboardHeader } from "./dashboard-header";
import { BookingReceiptDialog } from "./booking-receipt-dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Status = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

type Booking = {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email?: string | null;
  barber_id: string | null;
  service_id: string | null;
  booking_date: string;
  start_time: string;
  status: Status;
  price: number;
  notes: string | null;
  barber?: { name: string } | null;
  service?: { name: string; price: number; category?: string; duration_minutes?: number } | null;
  booking_services?: any[];
};

const HOURS = [
  "09:00:00",
  "10:00:00",
  "11:00:00",
  "12:00:00",
  "13:00:00",
  "14:00:00",
  "15:00:00",
  "16:00:00",
  "17:00:00",
  "18:00:00"
];

const STATUSES: Status[] = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

export function CalendarPage() {
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modals state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    barber_id: "",
    service_id: "",
    booking_date: "",
    start_time: "",
    status: "pending" as Status,
    price: 0,
    notes: ""
  });

  const formattedDateString = format(currentDate, "yyyy-MM-dd");

  // 1. Fetch active barbers
  const { data: barbers = [] } = useQuery<any[]>({
    queryKey: ["barbers", "active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name, avatar_url, specialization")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch active services
  const { data: services = [] } = useQuery<any[]>({
    queryKey: ["services", "active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes, category")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // 3. Fetch bookings for current date
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["bookings-calendar", formattedDateString],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, barber:barbers(name), service:services(name, price, category, duration_minutes), booking_services(*)")
        .eq("booking_date", formattedDateString);
      if (error) throw error;
      return data as Booking[];
    },
  });

  // Reschedule / Move mutation
  const rescheduleBooking = useMutation({
    mutationFn: async ({ id, barber_id, start_time }: { id: string; barber_id: string; start_time: string }) => {
      const { error } = await supabase
        .from("bookings")
        .update({
          barber_id: barber_id || null,
          start_time,
          booking_date: formattedDateString
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rescheduled successfully");
      qc.invalidateQueries({ queryKey: ["bookings-calendar"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reschedule booking");
    }
  });

  // Save full edit mutation
  const saveBookingEdit = useMutation({
    mutationFn: async () => {
      if (!selectedBooking) return;
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        customer_email: form.customer_email.trim() || null,
        barber_id: form.barber_id || null,
        service_id: form.service_id || null,
        booking_date: form.booking_date,
        start_time: form.start_time,
        status: form.status,
        price: form.price,
        notes: form.notes.trim() || null
      };

      const { error } = await supabase
        .from("bookings")
        .update(payload)
        .eq("id", selectedBooking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking details saved");
      setIsEditMode(false);
      setSelectedBooking(null);
      qc.invalidateQueries({ queryKey: ["bookings-calendar"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save booking");
    }
  });

  // Save new booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        customer_email: form.customer_email.trim() || null,
        barber_id: form.barber_id || null,
        service_id: form.service_id || null,
        booking_date: form.booking_date,
        start_time: form.start_time + ":00",
        status: form.status,
        price: form.price,
        notes: form.notes.trim() || null
      };

      const { error } = await supabase.from("bookings").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking created successfully");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["bookings-calendar"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create booking");
    }
  });

  // Delete booking mutation
  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking removed");
      setSelectedBooking(null);
      qc.invalidateQueries({ queryKey: ["bookings-calendar"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete booking");
    }
  });

  // Quick status updates
  const quickUpdateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Booking status changed to ${variables.status}`);
      setSelectedBooking(null);
      qc.invalidateQueries({ queryKey: ["bookings-calendar"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    }
  });

  const handleStartEdit = (b: Booking) => {
    setIsEditMode(true);
    setForm({
      customer_name: b.customer_name,
      customer_phone: b.customer_phone || "",
      customer_email: b.customer_email || "",
      barber_id: b.barber_id || "",
      service_id: b.service_id || "",
      booking_date: b.booking_date,
      start_time: b.start_time.slice(0, 5),
      status: b.status,
      price: b.price,
      notes: b.notes || ""
    });
  };

  const handleStartNew = () => {
    setForm({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      barber_id: barbers[0]?.id || "",
      service_id: services[0]?.id || "",
      booking_date: formattedDateString,
      start_time: "10:00",
      status: "pending",
      price: services[0]?.price ? Number(services[0].price) : 0,
      notes: ""
    });
    setCreateOpen(true);
  };

  // Drag and Drop Helpers
  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    e.dataTransfer.setData("text/plain", booking.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.currentTarget.classList.add("bg-sky-500/10", "border-sky-500/50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-sky-500/10", "border-sky-500/50");
  };

  const handleDrop = async (e: React.DragEvent, barberId: string, hour: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-sky-500/10", "border-sky-500/50");
    const bookingId = e.dataTransfer.getData("text/plain");
    if (bookingId) {
      rescheduleBooking.mutate({ id: bookingId, barber_id: barberId, start_time: hour });
    }
  };

  const getCardColorClass = (status: Status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300";
      case "no_show":
        return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800 text-red-800 dark:text-red-300";
      case "cancelled":
        return "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-800 text-zinc-500";
      case "confirmed":
        return "bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-850 text-sky-800 dark:text-sky-300";
      default:
        return "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-850 text-amber-850 dark:text-amber-300";
    }
  };

  return (
    <div className="space-y-6 font-mono">
      <DashboardHeader
        title="Schedule Grid"
        subtitle="Visual hourly scheduler timeline with drag-and-drop rescheduling"
        actions={
          <div className="flex items-center gap-3">
            {/* Date Selector Header controls */}
            <div className="flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentDate((prev) => subDays(prev, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1.5 px-2">
                <CalendarIcon className="h-3.5 w-3.5 text-sky-500" />
                <Input
                  type="date"
                  value={formattedDateString}
                  className="h-8 w-36 border-none p-0 bg-transparent text-xs font-bold text-center focus-visible:ring-0"
                  onChange={(e) => {
                    const parsed = new Date(e.target.value);
                    if (!isNaN(parsed.getTime())) setCurrentDate(parsed);
                  }}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentDate((prev) => addDays(prev, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button size="sm" onClick={handleStartNew}>
              <Plus className="mr-1.5 h-4 w-4" /> New booking
            </Button>
          </div>
        }
      />

      {/* Main Grid View Container */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          ) : (
            <div className="min-w-[800px] divide-y divide-zinc-200 dark:divide-zinc-800">
              {/* Grid Column Headers (Barbers) */}
              <div className="flex items-center bg-muted/30 dark:bg-muted/10 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
                {/* Empty corner header cell for time rows labels */}
                <div className="w-20 shrink-0 text-center text-[10px] font-bold text-muted-foreground uppercase border-r h-14 flex items-center justify-center bg-muted/40">
                  Time Slot
                </div>
                {barbers.map((b) => (
                  <div
                    key={b.id}
                    className="flex-1 min-w-[150px] border-r last:border-r-0 h-14 flex items-center gap-2.5 px-4"
                  >
                    <Avatar className="h-8 w-8">
                      {b.avatar_url && <AvatarImage src={b.avatar_url} />}
                      <AvatarFallback className="text-[10px]">
                        {b.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 leading-tight">
                      <span className="text-xs font-bold block truncate uppercase">{b.name}</span>
                      <span className="text-[9px] text-muted-foreground truncate block uppercase">
                        {b.specialization || "Barber"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid Hourly Rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="flex min-h-[110px] items-stretch border-b last:border-b-0">
                  {/* Left Label Time Cell */}
                  <div className="w-20 shrink-0 border-r flex flex-col justify-start pt-3 px-1 text-center bg-muted/5">
                    <span className="font-extrabold text-xs text-sky-600 dark:text-sky-400">
                      {formatTime(hour)}
                    </span>
                  </div>

                  {/* Drop Targets Barber Cells */}
                  {barbers.map((b) => {
                    // Match bookings falling in this barber's hour slot
                    const hourPrefix = hour.slice(0, 3); // e.g. "09:" or "10:"
                    const matchedBookings = bookings.filter(
                      (bk) => bk.barber_id === b.id && bk.start_time.startsWith(hourPrefix)
                    );

                    return (
                      <div
                        key={b.id}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, b.id, hour)}
                        className="flex-1 min-w-[150px] border-r last:border-r-0 p-1.5 flex flex-col gap-1.5 transition-colors border-2 border-transparent"
                      >
                        {matchedBookings.map((bk) => (
                          <div
                            key={bk.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, bk)}
                            onClick={() => setSelectedBooking(bk)}
                            className={cn(
                              "border rounded p-2 text-left cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none",
                              getCardColorClass(bk.status)
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase shrink-0">
                                {formatTime(bk.start_time.slice(0, 5))}
                              </span>
                              <Badge variant="outline" className="text-[8px] scale-90 uppercase px-1 leading-none bg-background">
                                {bk.status}
                              </Badge>
                            </div>
                            <h4 className="text-[11px] font-extrabold truncate uppercase leading-tight">
                              {bk.customer_name}
                            </h4>
                            <p className="text-[9px] text-muted-foreground truncate uppercase mt-0.5 font-bold">
                              {bk.service?.name || "Service"}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail / Action Dialog */}
      <Dialog open={!!selectedBooking && !isEditMode} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        {selectedBooking && (
          <DialogContent className="sm:max-w-md font-mono">
            <DialogHeader>
              <DialogTitle className="text-base uppercase flex justify-between items-center pr-6">
                <span>Appointment Detail</span>
                <span className="text-[10px] text-zinc-500 leading-none">Ref: {selectedBooking.reference}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] uppercase text-zinc-400 block tracking-wider">Customer Name</span>
                  <span className="font-bold uppercase text-sm block">{selectedBooking.customer_name}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-zinc-400 block tracking-wider">Assigned Barber</span>
                  <span className="font-bold uppercase text-sm block">
                    {selectedBooking.barber?.name || "ANY BARBER"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-zinc-400 block tracking-wider">Phone number</span>
                  <span className="font-semibold block">{selectedBooking.customer_phone || "—"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-zinc-400 block tracking-wider">Booking date</span>
                  <span className="font-bold uppercase block">{selectedBooking.booking_date}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-zinc-400 block tracking-wider">Service Type</span>
                  <span className="font-bold uppercase block">{selectedBooking.service?.name || "Service"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-zinc-400 block tracking-wider">Time slot</span>
                  <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                    {formatTime(selectedBooking.start_time.slice(0, 5))}
                  </span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="bg-muted/40 p-2 border rounded text-xs leading-normal">
                  <span className="font-bold text-[9px] text-zinc-500 uppercase block tracking-wider mb-0.5">Customer Notes</span>
                  <p className="italic">"{selectedBooking.notes}"</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
              <div className="flex gap-2 w-full justify-between items-center">
                <Button size="xs" variant="destructive" onClick={() => {
                  if (confirm(`Delete appointment for ${selectedBooking.customer_name}?`)) {
                    deleteBooking.mutate(selectedBooking.id);
                  }
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>

                <div className="flex gap-1.5 justify-end">
                  <Button size="xs" variant="outline" onClick={() => setReceiptOpen(true)}>
                    <Receipt className="mr-1 h-3.5 w-3.5" /> Receipt
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => handleStartEdit(selectedBooking)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  
                  {/* Status quick triggers */}
                  {(selectedBooking.status === "pending" || selectedBooking.status === "confirmed") && (
                    <>
                      <Button
                        size="xs"
                        variant="outline"
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/20"
                        onClick={() => quickUpdateStatus.mutate({ id: selectedBooking.id, status: "completed" })}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> Done
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20"
                        onClick={() => quickUpdateStatus.mutate({ id: selectedBooking.id, status: "no_show" })}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" /> No-Show
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={!!selectedBooking && isEditMode} onOpenChange={(open) => !open && setIsEditMode(false)}>
        {selectedBooking && (
          <DialogContent className="sm:max-w-md font-mono">
            <DialogHeader>
              <DialogTitle>Edit booking: {selectedBooking.reference}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 overflow-hidden py-2 border-t pt-4">
              <div className="col-span-2 space-y-1.5"><Label>Customer name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5"><Label>Phone</Label>
                <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5"><Label>Email</Label>
                <Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
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
              <div className="col-span-2 space-y-1.5"><Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
              <Button onClick={() => saveBookingEdit.mutate()} disabled={!form.customer_name.trim() || saveBookingEdit.isPending}>
                {saveBookingEdit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Create Form Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md font-mono">
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 overflow-hidden py-2 border-t pt-4">
            <div className="col-span-2 space-y-1.5"><Label>Customer name</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Phone</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Email</Label>
              <Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
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
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createBooking.mutate()} disabled={!form.customer_name.trim() || createBooking.isPending}>
              {createBooking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Receipt Dialog (imported component) */}
      <BookingReceiptDialog 
        isOpen={receiptOpen} 
        onOpenChange={setReceiptOpen} 
        booking={selectedBooking} 
      />
    </div>
  );
}
