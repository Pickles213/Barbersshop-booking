import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  CalendarClock,
  Star,
  ShieldAlert,
  LogOut,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  User,
  MapPin,
  Save,
  Plus,
  Receipt,
  Pencil,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingReceiptDialog } from "@/components/admin/booking-receipt-dialog";
import { cn, formatTime } from "@/lib/utils";

export const Route = createFileRoute("/barber")({
  ssr: false,
  component: BarberPortalPage,
});

type Tab = "calendar" | "bookings" | "schedule" | "reviews";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

function BarberPortalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Bookings Filter
  const [bookingFilter, setBookingFilter] = useState<string>("all");

  // Time off Request Form State
  const [timeOffStart, setTimeOffStart] = useState("");
  const [timeOffEnd, setTimeOffEnd] = useState("");
  const [timeOffReason, setTimeOffReason] = useState("");

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    service_id: "",
    booking_date: "",
    start_time: "",
    status: "pending" as "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show",
    price: 0,
    notes: ""
  });

  // 1. Get authenticated user
  const userQuery = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  const user = userQuery.data;

  // Sign out handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate({ to: "/auth" });
  };

  // Redirect to login if user loading finishes but no user is found
  useEffect(() => {
    if (!userQuery.isLoading && !userQuery.data) {
      navigate({ to: "/auth", search: { redirect: "/barber" } });
    }
  }, [userQuery.isLoading, userQuery.data, navigate]);

  // 2. Fetch linked barber profile
  const barberQuery = useQuery({
    queryKey: ["linked-barber", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const barber = barberQuery.data;

  // 3. Fetch user permissions
  const permissionsQuery = useQuery<string[]>({
    queryKey: ["my-permissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_permissions");
      if (error) throw error;
      return (data as string[]) ?? [];
    },
    enabled: !!user,
  });

  const permissions = permissionsQuery.data ?? [];

  // Helper check for specific permissions
  const hasPerm = (p: string) => permissions.includes(p);

  // Auto-switch tabs to first allowed option once permissions load
  useEffect(() => {
    if (permissionsQuery.data) {
      if (hasPerm("calendar.view")) {
        setActiveTab("calendar");
      } else if (hasPerm("bookings.view_own")) {
        setActiveTab("bookings");
      } else if (hasPerm("schedule.view_own")) {
        setActiveTab("schedule");
      } else if (hasPerm("reviews.view_own")) {
        setActiveTab("reviews");
      }
    }
  }, [permissionsQuery.data]);

  // 4. Fetch Bookings assigned to this barber
  const bookingsQuery = useQuery({
    queryKey: ["barber-bookings", barber?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, service:services(name, category, duration_minutes)")
        .eq("barber_id", barber!.id)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!barber && (hasPerm("calendar.view") || hasPerm("bookings.view_own")),
  });

  const bookings = bookingsQuery.data ?? [];

  // Filter bookings for Calendar (by selected date)
  const calendarBookings = useMemo(() => {
    if (!selectedDate) return [];
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    return bookings.filter((b) => b.booking_date === formattedDate);
  }, [bookings, selectedDate]);

  // Filter bookings for Bookings Tab (by status filter)
  const filteredBookings = useMemo(() => {
    if (bookingFilter === "all") return bookings;
    return bookings.filter((b) => b.status === bookingFilter);
  }, [bookings, bookingFilter]);

  // Status Counter for dashboard Overview
  const upcomingCount = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return bookings.filter((b) => b.booking_date >= todayStr && (b.status === "pending" || b.status === "confirmed")).length;
  }, [bookings]);

  // 5. Fetch Schedules
  const scheduleQuery = useQuery({
    queryKey: ["barber-schedule", barber?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("barber_id", barber!.id)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!barber && hasPerm("schedule.view_own"),
  });

  const weeklySchedule = scheduleQuery.data ?? [];

  // 6. Fetch Time-off requests
  const timeOffQuery = useQuery({
    queryKey: ["barber-time-off", barber?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_off")
        .select("*")
        .eq("barber_id", barber!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!barber && hasPerm("schedule.view_own"),
  });

  const timeOffRequests = timeOffQuery.data ?? [];

  // 7. Fetch Customer Reviews
  const reviewsQuery = useQuery({
    queryKey: ["barber-reviews", barber?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("barber_id", barber!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!barber && hasPerm("reviews.view_own"),
  });

  const reviews = reviewsQuery.data ?? [];

  // Fetch active services for edit form dropdown
  const servicesQuery = useQuery<any[]>({
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
  const services = servicesQuery.data ?? [];

  // Mutation to reschedule booking
  const rescheduleBooking = useMutation({
    mutationFn: async ({ id, start_time }: { id: string; start_time: string }) => {
      const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase
        .from("bookings")
        .update({
          start_time,
          booking_date: formattedDate
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rescheduled successfully");
      qc.invalidateQueries({ queryKey: ["barber-bookings"] });
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
      qc.invalidateQueries({ queryKey: ["barber-bookings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save booking");
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
      qc.invalidateQueries({ queryKey: ["barber-bookings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete booking");
    }
  });

  // Quick status updates
  const quickUpdateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Booking status changed to ${variables.status}`);
      setSelectedBooking(null);
      qc.invalidateQueries({ queryKey: ["barber-bookings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    }
  });

  const handleStartEdit = (b: any) => {
    setIsEditMode(true);
    setForm({
      customer_name: b.customer_name,
      customer_phone: b.customer_phone || "",
      customer_email: b.customer_email || "",
      service_id: b.service_id || "",
      booking_date: b.booking_date,
      start_time: b.start_time.slice(0, 5),
      status: b.status,
      price: b.price,
      notes: b.notes || ""
    });
  };

  // Mutation to update booking status
  const updateBookingStatus = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: "completed" | "no_show" }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking status updated successfully");
      qc.invalidateQueries({ queryKey: ["barber-bookings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update booking status");
    },
  });

  // Mutation to update schedules
  const updateScheduleDay = useMutation({
    mutationFn: async ({ id, start_time, end_time, is_off }: { id: string; start_time: string; end_time: string; is_off: boolean }) => {
      const { error } = await supabase
        .from("schedules")
        .update({ start_time, end_time, is_off })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Working hours updated");
      qc.invalidateQueries({ queryKey: ["barber-schedule"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update schedule");
    },
  });

  // Mutation to request time off
  const requestTimeOff = useMutation({
    mutationFn: async () => {
      if (!timeOffStart || !timeOffEnd) throw new Error("Dates are required");
      const { error } = await supabase.from("time_off").insert({
        barber_id: barber!.id,
        start_date: timeOffStart,
        end_date: timeOffEnd,
        reason: timeOffReason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Time-off requested successfully");
      setTimeOffStart("");
      setTimeOffEnd("");
      setTimeOffReason("");
      qc.invalidateQueries({ queryKey: ["barber-time-off"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit request");
    },
  });

  // Gating & Loading States
  if (userQuery.isLoading || (user && barberQuery.isLoading)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center font-mono">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-sky-500" />
          <p className="text-xs uppercase tracking-widest text-zinc-500 animate-pulse">
            [ Loading Barber Portal... ]
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Gated check: user is authenticated but has no linked barber profile
  if (!barberQuery.isLoading && !barber) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 font-mono text-zinc-900 dark:text-zinc-50">
        <Card className="max-w-md w-full border-zinc-200 dark:border-zinc-800">
          <CardHeader className="text-center space-y-3">
            <div className="bg-red-500/10 text-red-500 p-3 rounded-full w-fit mx-auto">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="uppercase tracking-tight text-xl font-bold">Access Denied</CardTitle>
            <CardDescription className="text-xs">
              Account: <span className="font-semibold text-foreground">{user.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-center leading-relaxed text-muted-foreground border-t pt-4">
            Your login account is not linked to any barber profile in the system. 
            An administrator must link your user account in the Admin console before you can view schedule details, bookings, or reviews.
          </CardContent>
          <CardFooter className="flex justify-center bg-muted/20 border-t pt-3">
            <Button size="sm" variant="outline" className="font-mono text-xs uppercase" onClick={handleLogout}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Dashboard Header stats helpers
  const statRating = Number(barber?.rating || 5).toFixed(1);
  const activeStatus = barber?.is_active ? "Active" : "Inactive";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-50 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b bg-white dark:bg-zinc-900/50 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 overflow-hidden rounded border border-zinc-200 dark:border-zinc-800 shrink-0">
            <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wide">Barber Portal</h1>
            <p className="text-[10px] text-muted-foreground uppercase">{barber?.name} · {activeStatus}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" className="text-[10px] h-8 uppercase font-bold" onClick={handleLogout}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main dashboard container */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Performance stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Upcoming Appointments</p>
                <h3 className="text-2xl font-bold mt-0.5">{upcomingCount}</h3>
              </div>
              <CalendarDays className="h-8 w-8 text-sky-500/80" />
            </CardContent>
          </Card>
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Average Rating</p>
                <h3 className="text-2xl font-bold mt-0.5">{statRating} ★</h3>
              </div>
              <Star className="h-8 w-8 text-amber-500/80 fill-amber-500/20" />
            </CardContent>
          </Card>
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Specialization</p>
                <h3 className="text-sm font-bold mt-1.5 truncate max-w-[200px]">
                  {barber?.specialization || "General Cuts"}
                </h3>
              </div>
              <User className="h-8 w-8 text-emerald-500/80" />
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Tab Navigation Gated by Permissions */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          {hasPerm("calendar.view") && (
            <button
              onClick={() => setActiveTab("calendar")}
              className={cn(
                "px-3 py-2 text-xs font-bold uppercase transition-all border border-transparent select-none cursor-pointer",
                activeTab === "calendar"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-muted-foreground"
              )}
            >
              [ CALENDAR ]
            </button>
          )}

          {hasPerm("bookings.view_own") && (
            <button
              onClick={() => setActiveTab("bookings")}
              className={cn(
                "px-3 py-2 text-xs font-bold uppercase transition-all border border-transparent select-none cursor-pointer",
                activeTab === "bookings"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-muted-foreground"
              )}
            >
              [ BOOKINGS LIST ]
            </button>
          )}

          {hasPerm("schedule.view_own") && (
            <button
              onClick={() => setActiveTab("schedule")}
              className={cn(
                "px-3 py-2 text-xs font-bold uppercase transition-all border border-transparent select-none cursor-pointer",
                activeTab === "schedule"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-muted-foreground"
              )}
            >
              [ WORK SCHEDULE ]
            </button>
          )}

          {hasPerm("reviews.view_own") && (
            <button
              onClick={() => setActiveTab("reviews")}
              className={cn(
                "px-3 py-2 text-xs font-bold uppercase transition-all border border-transparent select-none cursor-pointer",
                activeTab === "reviews"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-muted-foreground"
              )}
            >
              [ REVIEWS ]
            </button>
          )}
        </div>

        {/* Tab Contents */}
        {activeTab === "calendar" && hasPerm("calendar.view") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left side: calendar date selection */}
            <Card className="lg:col-span-1 border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase">Select Date</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="border rounded-lg bg-white dark:bg-zinc-900"
                />
              </CardContent>
            </Card>

            {/* Right side: bookings drag & drop timeline */}
            <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase flex justify-between">
                  <span>Schedule for {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Selected Date"}</span>
                  <span className="text-[10px] text-zinc-500 font-normal">({calendarBookings.length} bookings)</span>
                </CardTitle>
                <CardDescription className="text-[10px] font-mono mt-0.5">Drag and drop bookings to reschedule. Click a booking card to manage actions.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 border-t">
                {bookingsQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Loading schedules…</p>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {HOURS.map((hour) => {
                      const hourPrefix = hour.slice(0, 3); // e.g. "09:" or "10:"
                      const matchedBookings = calendarBookings.filter(
                        (b: any) => b.start_time.startsWith(hourPrefix)
                      );

                      return (
                        <div key={hour} className="flex min-h-[90px] items-stretch">
                          {/* Time label cell */}
                          <div className="w-20 shrink-0 border-r flex flex-col justify-start pt-3 px-1 text-center bg-muted/5">
                            <span className="font-extrabold text-xs text-sky-600 dark:text-sky-400">
                              {formatTime(hour)}
                            </span>
                          </div>

                          {/* Drop target cell */}
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnter={(e) => e.currentTarget.classList.add("bg-sky-500/10", "border-sky-500/50")}
                            onDragLeave={(e) => e.currentTarget.classList.remove("bg-sky-500/10", "border-sky-500/50")}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove("bg-sky-500/10", "border-sky-500/50");
                              const id = e.dataTransfer.getData("text/plain");
                              if (id) rescheduleBooking.mutate({ id, start_time: hour });
                            }}
                            className="flex-1 p-2 flex flex-col gap-2 transition-colors border-2 border-transparent"
                          >
                            {matchedBookings.map((b: any) => {
                              // Styling helper based on status
                              const getCardColorClass = (status: string) => {
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
                                <div
                                  key={b.id}
                                  draggable
                                  onDragStart={(e) => e.dataTransfer.setData("text/plain", b.id)}
                                  onClick={() => setSelectedBooking(b)}
                                  className={cn(
                                    "border rounded p-2 text-left cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none text-xs sm:text-sm",
                                    getCardColorClass(b.status)
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase shrink-0">
                                      {formatTime(b.start_time.slice(0, 5))}
                                    </span>
                                    <Badge variant="outline" className="text-[8px] scale-90 uppercase px-1 leading-none bg-background">
                                      {b.status}
                                    </Badge>
                                  </div>
                                  <h4 className="text-[11px] font-extrabold truncate uppercase leading-tight">
                                    {b.customer_name}
                                  </h4>
                                  <p className="text-[9px] text-muted-foreground truncate uppercase mt-0.5 font-bold">
                                    {b.service?.name || "Service"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "bookings" && hasPerm("bookings.view_own") && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
              <div>
                <CardTitle className="text-sm font-bold uppercase">All My Bookings</CardTitle>
                <CardDescription className="text-[10px] font-mono mt-0.5">Comprehensive view of all your assigned appointments</CardDescription>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-1.5">
                {["all", "pending", "confirmed", "completed", "no_show", "cancelled"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setBookingFilter(status)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] uppercase font-bold border rounded transition-all cursor-pointer",
                      bookingFilter === status
                        ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900"
                        : "bg-muted/50 border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {status.replace("_", "-")}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {bookingsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground text-center py-6">Loading appointments…</p>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg">
                  <p className="text-xs text-muted-foreground">No bookings found for the selected status filter.</p>
                </div>
              ) : (
                filteredBookings.map((b: any) => (
                  <div
                    key={b.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded p-3 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold uppercase font-mono tracking-wider text-sky-600 dark:text-sky-400">
                          {b.booking_date} · {formatTime(b.start_time)}
                        </span>
                        <span className="text-muted-foreground">({b.service?.duration_minutes} mins)</span>
                        <Badge variant="outline" className="text-[9px] uppercase leading-none font-mono">
                          {b.status}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold">{b.customer_name}</h4>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 uppercase">
                        <span>Service: <strong className="text-foreground">{b.service?.name}</strong></span>
                        <span>Phone: <strong className="text-foreground">{b.customer_phone || "—"}</strong></span>
                        <span>Ref: <strong className="text-mono text-foreground">{b.reference}</strong></span>
                      </div>
                      {b.notes && (
                        <p className="text-xs italic bg-muted/40 p-1.5 rounded mt-1 border">
                          Note: {b.notes}
                        </p>
                      )}
                    </div>

                    {/* Action buttons (Complete / No-show) */}
                    {hasPerm("bookings.update_own_status") && (b.status === "pending" || b.status === "confirmed") && (
                      <div className="flex gap-1.5 justify-end shrink-0 mt-2 sm:mt-0">
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-[10px] h-8 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/20"
                          onClick={() => updateBookingStatus.mutate({ bookingId: b.id, status: "completed" })}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Done
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-[10px] h-8 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20"
                          onClick={() => updateBookingStatus.mutate({ bookingId: b.id, status: "no_show" })}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" /> No-Show
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "schedule" && hasPerm("schedule.view_own") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Shifts list & management */}
            <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase">Weekly Shift Schedule</CardTitle>
                <CardDescription className="text-[10px] font-mono mt-0.5">
                  {hasPerm("schedule.edit_own") 
                    ? "Manage your weekly shift hours and rest days directly." 
                    : "Your weekly shift schedules as configured by the administrator."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {scheduleQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Loading schedules…</p>
                ) : (
                  weeklySchedule.map((s: any) => {
                    const dayLabel = DAYS[s.day_of_week];

                    return (
                      <div
                        key={s.id}
                        className="border border-zinc-200 dark:border-zinc-800 rounded p-3 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900"
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold uppercase font-mono">{dayLabel}</h4>
                          <p className="text-xs text-muted-foreground uppercase">
                            {s.is_off 
                              ? "Rest Day (Off-duty)" 
                              : `Duty Hours: ${formatTime(s.start_time)} - ${formatTime(s.end_time)}`}
                          </p>
                        </div>

                        {/* Inline hours editing if schedule.edit_own is granted */}
                        {hasPerm("schedule.edit_own") && (
                          <div className="flex items-center gap-3 mt-2 sm:mt-0 font-mono">
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] uppercase text-muted-foreground">Off</Label>
                              <Switch
                                checked={s.is_off}
                                onCheckedChange={(val) =>
                                  updateScheduleDay.mutate({
                                    id: s.id,
                                    start_time: s.start_time,
                                    end_time: s.end_time,
                                    is_off: val,
                                  })
                                }
                              />
                            </div>
                            {!s.is_off && (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="time"
                                  value={s.start_time.slice(0, 5)}
                                  className="h-8 w-24 text-xs"
                                  onChange={(e) =>
                                    updateScheduleDay.mutate({
                                      id: s.id,
                                      start_time: `${e.target.value}:00`,
                                      end_time: s.end_time,
                                      is_off: s.is_off,
                                    })
                                  }
                                />
                                <span className="text-zinc-400">—</span>
                                <Input
                                  type="time"
                                  value={s.end_time.slice(0, 5)}
                                  className="h-8 w-24 text-xs"
                                  onChange={(e) =>
                                    updateScheduleDay.mutate({
                                      id: s.id,
                                      start_time: s.start_time,
                                      end_time: `${e.target.value}:00`,
                                      is_off: s.is_off,
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Time off Request Forms */}
            <div className="space-y-6 lg:col-span-1">
              {hasPerm("time_off.request_own") && (
                <Card className="border-zinc-200 dark:border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase">Request Time Off</CardTitle>
                    <CardDescription className="text-[10px] font-mono mt-0.5">Submit request for leaves/holidays.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 font-mono">
                    <div className="space-y-1.5">
                      <Label htmlFor="to-start">Start Date</Label>
                      <Input
                        id="to-start"
                        type="date"
                        value={timeOffStart}
                        onChange={(e) => setTimeOffStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="to-end">End Date</Label>
                      <Input
                        id="to-end"
                        type="date"
                        value={timeOffEnd}
                        onChange={(e) => setTimeOffEnd(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="to-reason">Reason</Label>
                      <Textarea
                        id="to-reason"
                        placeholder="e.g. Personal emergency, family gathering"
                        value={timeOffReason}
                        onChange={(e) => setTimeOffReason(e.target.value)}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3 bg-muted/20">
                    <Button
                      size="sm"
                      className="w-full text-xs font-bold uppercase"
                      disabled={!timeOffStart || !timeOffEnd || requestTimeOff.isPending}
                      onClick={() => requestTimeOff.mutate()}
                    >
                      {requestTimeOff.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
                      Submit Leave Request
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Leave Requests Log */}
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase">Time Off Log</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                  {timeOffQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground text-center">Loading leaves…</p>
                  ) : timeOffRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No leave requests logged.</p>
                  ) : (
                    timeOffRequests.map((r: any) => (
                      <div key={r.id} className="border p-2 rounded text-xs space-y-1 bg-muted/25 font-mono">
                        <div className="flex justify-between font-bold text-sky-600 dark:text-sky-400 uppercase">
                          <span>{r.start_date} · {r.end_date}</span>
                        </div>
                        {r.reason && <p className="text-[10px] text-muted-foreground">Reason: {r.reason}</p>}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "reviews" && hasPerm("reviews.view_own") && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">Customer Reviews</CardTitle>
              <CardDescription className="text-[10px] font-mono mt-0.5">Feedback left by clients for your bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviewsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground text-center py-6">Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg">
                  <p className="text-xs text-muted-foreground">No customer reviews left for you yet.</p>
                </div>
              ) : (
                reviews.map((r: any) => (
                  <div key={r.id} className="border border-zinc-200 dark:border-zinc-800 rounded p-3 bg-white dark:bg-zinc-900 font-mono text-xs sm:text-sm space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold">{r.customer_name}</h4>
                        <span className="text-[10px] text-muted-foreground">({r.service_name})</span>
                      </div>
                      <span className="text-amber-500 font-bold shrink-0">
                        {Array.from({ length: r.rating }).map((_, idx) => "★").join("")}
                      </span>
                    </div>
                    {r.comment ? (
                      <p className="italic text-muted-foreground bg-muted/15 p-2 rounded border">{r.comment}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No review comment left.</p>
                    )}
                    <p className="text-[10px] text-muted-foreground text-right">
                      {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Selected Booking Details Dialog */}
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
                    {selectedBooking.barber?.name || barber?.name}
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
                  if (confirm(`Cancel and delete appointment for ${selectedBooking.customer_name}?`)) {
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
                  
                  {/* Status quick triggers if update permission is active */}
                  {hasPerm("bookings.update_own_status") && (selectedBooking.status === "pending" || selectedBooking.status === "confirmed") && (
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

      {/* Selected Booking Edit Form Dialog */}
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
              <div className="col-span-2 space-y-1.5"><Label>Service</Label>
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
              <div className="space-y-1.5"><Label>Date</Label>
                <Input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Time</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"].map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
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

      {/* Booking Receipt Dialog */}
      <BookingReceiptDialog 
        isOpen={receiptOpen} 
        onOpenChange={setReceiptOpen} 
        booking={selectedBooking} 
      />
    </div>
  );
}
