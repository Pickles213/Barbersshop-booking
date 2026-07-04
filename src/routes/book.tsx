import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, Scissors, Star, User, ArrowLeft, ArrowUpRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatTime, cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchServices,
  fetchBarbers,
  fetchAvailableSlots,
  createBooking,
  type Service,
  type Barber,
} from "@/lib/customer-api";

const searchSchema = z.object({
  service: z.string().optional(),
  barber: z.string().optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/book")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Book an Appointment — Southside Barbers" },
      {
        name: "description",
        content: "Pick a service, choose your barber, and lock in a time. Guest checkout supported.",
      },
      { property: "og:title", content: "Book an Appointment — Southside Barbers" },
      {
        property: "og:description",
        content: "Pick a service, choose your barber, and lock in a time.",
      },
    ],
  }),
  component: BookPage,
});

const ANY_BARBER = "__any__";

function BookPage() {
  const { service: presetService, barber: presetBarber } = Route.useSearch();
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/book" } });
      } else {
        setCheckingAuth(false);
      }
    });
  }, [navigate]);

  // Steps: 1: Service, 2: Barber, 3: Date/Time, 4: Details, 5: Review/Confirm, 6: Success
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [serviceId, setServiceId] = useState<string | null>(presetService ?? null);
  const [barberId, setBarberId] = useState<string | null>(presetBarber ?? null);
  const [date, setDate] = useState<Date | undefined>(new Date()); // Pre-selected today's date
  const [slot, setSlot] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "", email: "", notes: "" });
  const [confirmation, setConfirmation] = useState<{ reference: string; price: number } | null>(
    null,
  );

  // Date selection state
  const [dateOffset, setDateOffset] = useState(0);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const barbers = useQuery({ queryKey: ["barbers"], queryFn: fetchBarbers });

  const service = useMemo(
    () => services.data?.find((s) => s.id === serviceId) ?? null,
    [services.data, serviceId],
  );
  const barber = useMemo(
    () => barbers.data?.find((b) => b.id === barberId) ?? null,
    [barbers.data, barberId],
  );

  // Auto-advance from step 1 if preset service provided
  useEffect(() => {
    if (presetService && service && step === 1) setStep(2);
  }, [service, presetService, step]);

  // Prefill email if signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && !details.email) {
        setDetails((d) => ({ ...d, email: data.user!.email! }));
      }
    });
  }, [details.email]);

  const dateStr = date ? format(date, "yyyy-MM-dd") : null;

  // Generate 7 visible days based on dateOffset
  const visibleDates = useMemo(() => {
    const list: Date[] = [];
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    // Add offset days to baseDate
    baseDate.setDate(baseDate.getDate() + dateOffset);
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      list.push(d);
    }
    return list;
  }, [dateOffset]);

  const slots = useQuery({
    queryKey: ["slots", barberId, dateStr, service?.duration_minutes],
    queryFn: async () => {
      if (!service || !dateStr) return [];
      if (barberId && barberId !== ANY_BARBER) {
        return fetchAvailableSlots(barberId, dateStr, service.duration_minutes);
      }
      // ANY barber: union of all barber slots
      const all = await Promise.all(
        (barbers.data ?? []).map((b) =>
          fetchAvailableSlots(b.id, dateStr, service.duration_minutes),
        ),
      );
      const set = new Set<string>();
      all.flat().forEach((s) => set.add(s));
      return Array.from(set).sort();
    },
    enabled: !!service && !!dateStr && (barberId === ANY_BARBER || !!barberId),
  });

  // Filter out time slots that have already passed in the user's browser local time today!
  const filteredSlots = useMemo(() => {
    const rawSlots = slots.data ?? [];
    if (!date) return [];

    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
    if (!isToday) return rawSlots;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return rawSlots.filter((slotStr) => {
      const [hStr, mStr] = slotStr.split(":");
      const slotHour = parseInt(hStr, 10);
      const slotMinute = parseInt(mStr, 10);

      if (slotHour > currentHour) return true;
      if (slotHour === currentHour && slotMinute > currentMinute) return true;
      return false;
    });
  }, [slots.data, date]);

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setConfirmation({ reference: data.reference, price: Number(data.price) });
      setStep(6);
    },
    onError: (err: Error) => toast.error(err.message ?? "Could not create booking"),
  });

  if (checkingAuth) {
    return (
      <SiteLayout>
        <div className="min-h-[500px] flex items-center justify-center bg-white dark:bg-zinc-950">
          <div className="font-mono text-xs uppercase tracking-widest text-zinc-500 animate-pulse">
            [ SECURING AUTHENTICATION SESSION... ]
          </div>
        </div>
      </SiteLayout>
    );
  }

  const submit = () => {
    if (!service || !dateStr || !slot) return;
    mutation.mutate({
      service_id: service.id,
      barber_id: barberId === ANY_BARBER ? null : barberId,
      booking_date: dateStr,
      start_time: slot + ":00",
      customer_name: details.name.trim(),
      customer_phone: details.phone.trim(),
      customer_email: details.email.trim(),
      notes: details.notes.trim() || undefined,
    });
  };

  const handleDetailsSubmit = () => {
    if (details.name.trim().length < 2) return toast.error("Please enter your full name");
    if (details.phone.trim().length < 5) return toast.error("Please enter a valid phone number");
    setStep(5); // Advance to Review & Confirm step
  };

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Editorial Brutalist Typography
          ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-zinc-950 text-black dark:text-white pt-16 pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
            [ RESERVATION GATEWAY ]
          </span>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[8.5rem] font-black tracking-tighter uppercase leading-[0.85] select-none text-black dark:text-white">
              BOOKING
            </h1>
            <p className="max-w-md text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-light leading-relaxed pb-3">
              Select your service, choose a master barber, and find a convenient date & time slot. Instant live validation secures your booking.
            </p>
          </div>

          <Stepper step={step} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BLACK MARQUEE STRIP ACROSS FULL WIDTH
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-t border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap justify-around sm:justify-between px-6 max-w-7xl mx-auto">
          <span>SELECT SERVICE</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>CHOOSE BARBER</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>DATE & TIME</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>DETAILS</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>CONFIRMATION</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          STEPPER CONTENT SYSTEM — Premium Brutalist Styling
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-zinc-950 text-black dark:text-white min-h-[500px]">
        <div className="mx-auto max-w-5xl px-6 md:px-10">

          {/* STEP 1: CHOOSE A SERVICE */}
          {step === 1 && (
            <StepCard title="[01] SELECT A SERVICE">
              <div className="grid gap-4 divide-y divide-zinc-200 dark:divide-zinc-800/80">
                {(services.data ?? []).map((s, idx) => (
                  <div key={s.id} className="pt-4 first:pt-0">
                    <ServiceRow
                      s={s}
                      idx={idx}
                      selected={s.id === serviceId}
                      onSelect={() => {
                        setServiceId(s.id);
                        setStep(2);
                      }}
                    />
                  </div>
                ))}
                {services.isLoading && (
                  <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest py-8 animate-pulse text-center">
                    [ FETCHING SERVICES CATALOG... ]
                  </p>
                )}
              </div>
            </StepCard>
          )}

          {/* STEP 2: CHOOSE YOUR BARBER */}
          {step === 2 && service && (
            <StepCard title="[02] CHOOSE YOUR BARBER" onBack={() => setStep(1)}>
              <div className="grid gap-6">
                {/* Any Barber Option */}
                <BarberRow
                  any
                  selected={barberId === ANY_BARBER}
                  onSelect={() => {
                    setBarberId(ANY_BARBER);
                    setStep(3);
                  }}
                />

                {/* Specific Barbers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(barbers.data ?? []).map((b) => (
                    <BarberRow
                      key={b.id}
                      b={b}
                      selected={b.id === barberId}
                      onSelect={() => {
                        setBarberId(b.id);
                        setStep(3);
                      }}
                    />
                  ))}
                </div>
              </div>
            </StepCard>
          )}

          {/* STEP 3: PICK DATE & TIME (Redesigned with Premium Dribble Horizontal Date Scroll & Calendar Popover) */}
          {step === 3 && service && (
            <StepCard title="[03] CHOOSE DATE & TIME" onBack={() => setStep(2)}>
              <div className="space-y-8">
                
                {/* 1. Header with Pagination Arrows and Month Calendar Dropdown Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">
                      Select a date
                    </h3>
                  </div>

                  {/* Right Header: Pagination Arrows + Calendar Icon Button */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-full p-1 bg-zinc-50 dark:bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => setDateOffset((prev) => Math.max(0, prev - 7))}
                        disabled={dateOffset === 0}
                        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4 text-black dark:text-white stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateOffset((prev) => prev + 7)}
                        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-black dark:text-white stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Popover Calendar Button for selecting arbitrary future months/weeks */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowFullCalendar(!showFullCalendar)}
                        className={cn(
                          "h-10 w-10 rounded-full border flex items-center justify-center transition-all",
                          showFullCalendar
                            ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md scale-95"
                            : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>

                      {showFullCalendar && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowFullCalendar(false)} />
                          <div className="absolute right-0 top-12 z-50 bg-white dark:bg-zinc-950 p-6 border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex justify-center shadow-inner min-w-[320px]">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={(d) => {
                                if (d) {
                                  setDate(d);
                                  setSlot(null);
                                  
                                  // Compute diffDays from today to shift the week slider offset
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const targetDate = new Date(d);
                                  targetDate.setHours(0, 0, 0, 0);
                                  const diffTime = targetDate.getTime() - today.getTime();
                                  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                                  
                                  // Align the horizontal week slider offset to show the week of selected date
                                  setDateOffset(Math.floor(diffDays / 7) * 7);
                                  setShowFullCalendar(false);
                                }
                              }}
                              disabled={(d) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return d < today;
                              }}
                              initialFocus
                              className="p-0 border-0"
                              classNames={{
                                months: "flex flex-col space-y-4",
                                month_caption: "font-mono text-sm font-black uppercase tracking-widest text-center pb-4 text-black dark:text-white flex justify-between items-center px-4",
                                weekdays: "flex justify-between text-zinc-400 dark:text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-wider pb-2 w-full",
                                weekday: "w-9 text-center",
                                week: "flex justify-between w-full mt-2",
                                day: "h-9 w-9 text-center p-0 relative",
                                day_button: cn(
                                  "h-9 w-9 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center",
                                  "hover:bg-zinc-200 dark:hover:bg-zinc-800 text-black dark:text-white"
                                ),
                                selected: "bg-black text-white dark:bg-white dark:text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl scale-95 font-black",
                                today: "border-b-2 border-black dark:border-white rounded-none font-black text-black dark:text-white",
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Horizontal Date Cards list (7 days matching current offset) */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x pointer-events-auto">
                  {visibleDates.map((d) => {
                    const isSel = date && format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
                    const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => {
                          setDate(d);
                          setSlot(null);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-between p-4 min-w-[85px] h-26 rounded-2xl border transition-all snap-start shrink-0",
                          isSel
                            ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white scale-95 shadow-md font-bold"
                            : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-850 dark:text-zinc-200 hover:border-black dark:hover:border-white",
                          isToday && !isSel && "border-zinc-400 dark:border-zinc-650"
                        )}
                      >
                        <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">
                          {format(d, "EEE")}
                        </span>
                        <span className="text-2xl font-black font-mono leading-none my-1">
                          {format(d, "d")}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">
                          {format(d, "MMM")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 3. Available schedules Grid */}
                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                  <div>
                    <h3 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Pick a time
                    </h3>
                    <p className="text-xs text-zinc-400 font-light">
                      {date ? `Showing slots for ${format(date, "MMMM d, yyyy")}` : "Please select a date above."}
                    </p>
                  </div>

                  {date && slots.isLoading && (
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse py-8 text-center">
                      [ CHECKING SLOT AVAILABILITY... ]
                    </p>
                  )}

                  {date && !slots.isLoading && filteredSlots.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">No Slots Available Today</p>
                      <p className="text-[10px] text-zinc-400 mt-1">Try clicking next page arrow `&gt;` or selecting a date via calendar icon.</p>
                    </div>
                  )}

                  {date && !slots.isLoading && filteredSlots.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {filteredSlots.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSlot(t)}
                          className={cn(
                            "rounded-xl border font-mono text-xs font-extrabold h-12 tracking-wider transition-all",
                            slot === t
                              ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white scale-95 shadow-md"
                              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 hover:border-black dark:hover:border-white"
                          )}
                        >
                          {formatTime(t)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Continue Navigation Button */}
                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!slot}
                    className={cn(
                      "rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.18em] uppercase px-8 h-12 shadow-md",
                      "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all"
                    )}
                  >
                    CONTINUE <ChevronRight className="ml-1 h-4 w-4 stroke-[2.5]" />
                  </Button>
                </div>

              </div>
            </StepCard>
          )}

          {/* STEP 4: ENTER DETAILS */}
          {step === 4 && service && (
            <StepCard title="[04] ENTER YOUR DETAILS" onBack={() => setStep(3)}>
              <div className="grid gap-10 lg:grid-cols-12 items-start">
                
                {/* Left Side: Summary Card */}
                <div className="lg:col-span-5">
                  <Summary service={service} barber={barber} date={date} slot={slot} />
                </div>

                {/* Right Side: Form details */}
                <div className="lg:col-span-7 space-y-6">
                  <Field
                    label="Full Name"
                    value={details.name}
                    onChange={(v) => setDetails({ ...details, name: v })}
                    required
                    placeholder="e.g. John Smith"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Phone Number"
                      value={details.phone}
                      onChange={(v) => setDetails({ ...details, phone: v })}
                      required
                      type="tel"
                      placeholder="e.g. +63 917 123 4567"
                    />
                    <Field
                      label="Email Address (Optional)"
                      value={details.email}
                      onChange={(v) => setDetails({ ...details, email: v })}
                      type="email"
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                      Message (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={details.notes}
                      onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                      placeholder="Hi! Anything we should know? (style preferences, allergies, etc.)"
                      className="rounded-xl border-zinc-350 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-black dark:focus-visible:ring-white text-sm"
                    />
                  </div>

                  <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                    <Button
                      onClick={handleDetailsSubmit}
                      className={cn(
                        "rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.2em] uppercase px-8 h-12 shadow-xl",
                        "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all"
                      )}
                    >
                      REVIEW BOOKING <ChevronRight className="ml-1 h-4 w-4 stroke-[2.5]" />
                    </Button>
                  </div>
                </div>

              </div>
            </StepCard>
          )}

          {/* STEP 5: REVIEW & CONFIRM */}
          {step === 5 && service && (
            <StepCard title="[05] REVIEW & CONFIRM" onBack={() => setStep(4)}>
              <div className="grid gap-10 lg:grid-cols-12 items-start">
                
                {/* Left Side: Disclosures & Policy info */}
                <div className="lg:col-span-7 space-y-6 text-sm text-black dark:text-white">
                  <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Review and confirm</h2>
                  
                  {/* Cancellation Policy Box */}
                  <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
                    <h4 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider">[ CANCELLATION POLICY ]</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-light">
                      Please cancel at least 6 hours before your scheduled appointment time.
                    </p>
                  </div>

                  {/* Important Information GCash Box */}
                  <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
                    <h4 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-500" /> [ IMPORTANT DISCLOSURE ]
                    </h4>
                    <div className="text-xs text-zinc-600 dark:text-zinc-450 space-y-3 font-light leading-relaxed">
                      <p>
                        To confirm your appointment, a <strong>50% down payment</strong> is required. Please note that the down payment is deductible from the service total. Your slot will be secured once payment is received.
                      </p>
                      
                      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">CANCELLATION TERMS:</span>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Appointments may be rescheduled with at least 4 hours' notice, subject to availability.</li>
                          <li>Cancellations made within 4 hours of the appointment and no-shows will result in forfeiture of the payment.</li>
                          <li>This policy is in place to compensate our barbers for reserving dedicated time exclusively for your appointment.</li>
                        </ul>
                      </div>

                      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                        <span className="font-mono font-bold text-black dark:text-white block">PAYMENT DETAILS :</span>
                        <p className="font-mono text-sm font-black text-black dark:text-white mt-1">
                          (GCASH) 09638863636 - ROD V
                        </p>
                        <p className="mt-2 font-semibold text-amber-600 dark:text-amber-400">
                          NOTE: Kindly send a screenshot of your Booking together with the payment receipt to our Southside Barbers Facebook page.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {details.notes.trim() && (
                    <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5">
                      <h4 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">[ YOUR NOTES ]</h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-450 italic">
                        "{details.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Side: Brutalist Receipt & Confirm Action */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Shop & Appointment Card */}
                  <div className="rounded-3xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/50 p-6 sm:p-8 space-y-6">
                    <div className="flex gap-4 items-start border-b border-zinc-200 dark:border-zinc-800 pb-4">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-black shrink-0 flex items-center justify-center text-white">
                        <Scissors className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
                          Southside Barbers
                        </h4>
                        <span className="flex items-center gap-1 text-xs font-bold font-mono">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> 5.0 (343 reviews)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs font-mono">
                      <div className="flex items-start gap-2.5">
                        <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                        <span className="font-bold text-black dark:text-white">{format(date!, "EEEE, MMMM d")}</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                        <span className="font-bold text-black dark:text-white">
                          {formatTime(slot!)} ({service.duration_minutes} min duration)
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <User className="h-4 w-4 text-zinc-400 shrink-0" />
                        <span className="font-bold text-zinc-600 dark:text-zinc-300">
                          {service.name} <span className="text-black dark:text-white font-black">₱{Number(service.price).toFixed(0)}</span>
                          <span className="block text-[10px] text-zinc-400 mt-0.5">with {barber?.name ?? "Any Available"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="border-t-2 border-dashed border-zinc-300 dark:border-zinc-800 pt-4 flex justify-between items-baseline">
                      <span className="font-mono text-xs font-bold uppercase text-zinc-400">Total</span>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-xs text-zinc-400">₱</span>
                        <span className="text-2xl font-black text-black dark:text-white tracking-tighter">
                          {Number(service.price).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={submit}
                      disabled={mutation.isPending}
                      className={cn(
                        "w-full rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.2em] uppercase h-14 shadow-xl",
                        "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                      )}
                    >
                      {mutation.isPending ? "CONFIRMING..." : "CONFIRM APPOINTMENT"} <ArrowUpRight className="ml-1.5 h-4 w-4 stroke-[2.5]" />
                    </Button>
                  </div>
                </div>

              </div>
            </StepCard>
          )}

          {/* STEP 6: BOOKING SUCCESS */}
          {step === 6 && confirmation && service && (
            <div className="rounded-3xl border-2 border-black dark:border-white p-8 sm:p-12 text-center space-y-8 bg-zinc-50 dark:bg-zinc-900/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 animate-bounce">
                <Check className="h-7 w-7 stroke-[2.5]" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Booking Confirmed!</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light">
                  We look forward to seeing you. Please save your reference code:
                </p>
                <div className="mt-3 inline-block bg-black text-white dark:bg-white dark:text-black px-6 py-2.5 font-mono text-2xl sm:text-3xl font-black tracking-widest border border-black rounded-lg">
                  {confirmation.reference}
                </div>
              </div>

              <div className="max-w-md mx-auto">
                <Summary service={service} barber={barber} date={date} slot={slot} />
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-855">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-zinc-300 dark:border-zinc-700 font-mono text-xs font-bold tracking-widest uppercase px-6 h-12 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                >
                  <Link to="/">BACK HOME</Link>
                </Button>
                <Button
                  onClick={() => navigate({ to: "/my-bookings" })}
                  className={cn(
                    "rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.15em] uppercase px-6 h-12 shadow-lg",
                    "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all"
                  )}
                >
                  VIEW MY BOOKINGS <ArrowUpRight className="ml-1.5 h-4 w-4 stroke-[2.5]" />
                </Button>
              </div>
            </div>
          )}

        </div>
      </section>
    </SiteLayout>
  );
}

// Stepper Step Progress Tracker
function Stepper({ step }: { step: number }) {
  const items = ["Service", "Barber", "Date & time", "Details", "Confirm"];
  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono">
      {items.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border text-[10px] font-black transition-all",
                active && "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black",
                done && "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                !active && !done && "border-zinc-300 text-zinc-400 dark:border-zinc-800 dark:text-zinc-650",
              )}
            >
              {done ? <Check className="h-3 w-3 stroke-[2.5]" /> : `0${n}`}
            </div>
            <span
              className={cn(
                "uppercase tracking-wider font-extrabold",
                active && "text-black dark:text-white underline decoration-2 underline-offset-4",
                done && "text-emerald-600 dark:text-emerald-400",
                !active && !done && "text-zinc-400 dark:text-zinc-650"
              )}
            >
              {label}
            </span>
            {i < items.length - 1 && <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-700 stroke-[1.5]" />}
          </div>
        );
      })}
    </div>
  );
}

// Step Wrapper Card
function StepCard({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-4">
        <h2 className="font-mono text-sm font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          {title}
        </h2>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" /> [ BACK ]
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// Service Selector row (Step 1)
function ServiceRow({
  s,
  idx,
  selected,
  onSelect,
}: {
  s: Service;
  idx: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const itemNum = (idx + 1).toString().padStart(2, "0");
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full py-5 px-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 text-left",
        "border-2 hover:border-black dark:hover:border-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40",
        selected ? "border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/50" : "border-transparent"
      )}
    >
      <div className="flex items-baseline gap-6 sm:gap-8">
        <span className="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-650 group-hover:text-black dark:group-hover:text-white transition-colors">
          [{itemNum}]
        </span>
        <div>
          <p className="text-base sm:text-lg font-bold uppercase tracking-tight text-black dark:text-white group-hover:translate-x-1 transition-transform">
            {s.name}
          </p>
          {s.description && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-light">
              {s.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 pl-12 sm:pl-0 font-mono text-xs">
        {s.duration_minutes && (
          <span className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} MIN
          </span>
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] text-zinc-400">₱</span>
          <span className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
            {Number(s.price).toFixed(0)}
          </span>
        </div>
      </div>
    </button>
  );
}

// Barber Selector row/card (Step 2)
function BarberRow({
  b,
  any,
  selected,
  onSelect,
}: {
  b?: Barber;
  any?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const imgSrc = b?.avatar_url || "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80";

  if (any) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 text-left flex items-center justify-between gap-6",
          "hover:border-black dark:hover:border-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40",
          selected ? "border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/50" : "border-zinc-200 dark:border-zinc-800"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-350 dark:border-zinc-700 text-black dark:text-white shrink-0">
            <User className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold uppercase tracking-tight text-black dark:text-white">
              ANY AVAILABLE BARBER
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
              We'll assign the first available master barber for your appointment slot.
            </p>
          </div>
        </div>

        <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:bg-black group-hover:text-white transition-colors shrink-0">
          [ SELECT ]
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border-2 p-5 transition-all duration-300 text-left flex flex-col justify-between gap-5 h-[230px]",
        "hover:border-black dark:hover:border-white hover:bg-zinc-50 dark:hover:bg-zinc-900/40",
        selected ? "border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/50 animate-pulse-slow" : "border-zinc-200 dark:border-zinc-800"
      )}
    >
      <div className="flex items-start justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-750 shrink-0">
            <img src={imgSrc} alt={b!.name} className="h-full w-full object-cover filter contrast-105" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-base font-black uppercase tracking-tight text-black dark:text-white truncate">
              {b!.name}
            </h4>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block truncate">
              {b!.specialization || "MASTER BARBER"}
            </p>
          </div>
        </div>

        {b?.rating != null && (
          <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 font-mono text-xs font-bold rounded">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {Number(b.rating).toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex-1 w-full">
        {b?.bio ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light leading-relaxed line-clamp-3">
            {b.bio}
          </p>
        ) : (
          <p className="text-xs text-zinc-400 font-light italic">
            Precision haircut craftsman specializing in modern fades and styling.
          </p>
        )}
      </div>

      <div className="w-full pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          [ CHOOSE {b!.name.split(" ")[0].toUpperCase()} ]
        </span>
      </div>
    </button>
  );
}

// Receipt/Summary box (Step 4 & 6)
function Summary({
  service,
  barber,
  date,
  slot,
}: {
  service: Service;
  barber: Barber | null;
  date?: Date;
  slot: string | null;
}) {
  return (
    <div className="rounded-3xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/50 p-6 sm:p-8 space-y-6">
      <div className="border-b-2 border-black dark:border-white pb-3">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
          [ RECEIPT SUMMARY ]
        </span>
      </div>

      <div className="space-y-3.5 text-sm">
        <div className="flex justify-between items-baseline gap-4">
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">SERVICE</span>
          <span className="font-black uppercase tracking-tight text-right text-black dark:text-white">{service.name}</span>
        </div>

        <div className="flex justify-between items-baseline gap-4">
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">BARBER</span>
          <span className="font-bold uppercase text-right text-black dark:text-white">
            {barber?.name ?? "ANY AVAILABLE BARBER"}
          </span>
        </div>

        {date && (
          <div className="flex justify-between items-baseline gap-4">
            <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">DATE</span>
            <span className="font-mono font-bold uppercase text-right">{format(date, "MMMM d, yyyy")}</span>
          </div>
        )}

        {slot && (
          <div className="flex justify-between items-baseline gap-4">
            <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">TIME</span>
            <span className="font-mono font-black uppercase text-right text-emerald-600 dark:text-emerald-400">
              {formatTime(slot)}
            </span>
          </div>
        )}
      </div>

      <div className="border-t-2 border-dashed border-zinc-300 dark:border-zinc-800 pt-4 flex justify-between items-baseline">
        <span className="font-mono text-xs font-bold uppercase text-zinc-400">NET DUE</span>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xs text-zinc-400">₱</span>
          <span className="text-2xl font-black text-black dark:text-white tracking-tighter">
            {Number(service.price).toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Input details Form field helper
function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider block">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="rounded-xl border-zinc-350 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-black dark:focus-visible:ring-white h-11"
      />
    </div>
  );
}
