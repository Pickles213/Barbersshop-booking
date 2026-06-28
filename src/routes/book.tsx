import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronRight, Clock, Scissors, Star, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
      { name: "description", content: "Pick a service, choose your barber, and lock in a time. Guest checkout supported." },
      { property: "og:title", content: "Book an Appointment — Southside Barbers" },
      { property: "og:description", content: "Pick a service, choose your barber, and lock in a time." },
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

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [serviceId, setServiceId] = useState<string | null>(presetService ?? null);
  const [barberId, setBarberId] = useState<string | null>(presetBarber ?? null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slot, setSlot] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "", email: "", notes: "" });
  const [confirmation, setConfirmation] = useState<{ reference: string; price: number } | null>(null);

  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const barbers = useQuery({ queryKey: ["barbers"], queryFn: fetchBarbers });

  if (checkingAuth) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </SiteLayout>
    );
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  // Prefill email if signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && !details.email) {
        setDetails((d) => ({ ...d, email: data.user!.email! }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateStr = date ? format(date, "yyyy-MM-dd") : null;

  const slots = useQuery({
    queryKey: ["slots", barberId, dateStr, service?.duration_minutes],
    queryFn: async () => {
      if (!service || !dateStr) return [];
      if (barberId && barberId !== ANY_BARBER) {
        return fetchAvailableSlots(barberId, dateStr, service.duration_minutes);
      }
      // ANY barber: union of all barber slots
      const all = await Promise.all(
        (barbers.data ?? []).map((b) => fetchAvailableSlots(b.id, dateStr, service.duration_minutes)),
      );
      const set = new Set<string>();
      all.flat().forEach((s) => set.add(s));
      return Array.from(set).sort();
    },
    enabled: !!service && !!dateStr && (barberId === ANY_BARBER || !!barberId),
  });

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setConfirmation({ reference: data.reference, price: Number(data.price) });
      setStep(5);
    },
    onError: (err: Error) => toast.error(err.message ?? "Could not create booking"),
  });

  const submit = () => {
    if (!service || !dateStr || !slot) return;
    if (details.name.trim().length < 2) return toast.error("Please enter your full name");
    if (details.phone.trim().length < 5) return toast.error("Please enter a valid phone number");
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

  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight">Book your appointment</h1>
          <Stepper step={step} />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10">
        {step === 1 && (
          <StepCard title="Choose a service">
            <div className="grid gap-3">
              {(services.data ?? []).map((s) => (
                <ServiceRow key={s.id} s={s} selected={s.id === serviceId} onSelect={() => { setServiceId(s.id); setStep(2); }} />
              ))}
              {services.isLoading && <p className="text-sm text-muted-foreground">Loading services…</p>}
            </div>
          </StepCard>
        )}

        {step === 2 && service && (
          <StepCard title="Choose your barber" onBack={() => setStep(1)}>
            <div className="grid gap-3">
              <BarberRow
                any
                selected={barberId === ANY_BARBER}
                onSelect={() => { setBarberId(ANY_BARBER); setStep(3); }}
              />
              {(barbers.data ?? []).map((b) => (
                <BarberRow
                  key={b.id}
                  b={b}
                  selected={b.id === barberId}
                  onSelect={() => { setBarberId(b.id); setStep(3); }}
                />
              ))}
            </div>
          </StepCard>
        )}

        {step === 3 && service && barberId && (
          <StepCard title="Pick a date & time" onBack={() => setStep(2)}>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="mb-2 block">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => { setDate(d); setSlot(null); }}
                      disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="mb-2 block">Time</Label>
                {!date && <p className="text-sm text-muted-foreground">Select a date to see slots.</p>}
                {date && slots.isLoading && <p className="text-sm text-muted-foreground">Checking availability…</p>}
                {date && !slots.isLoading && (slots.data?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">No slots available — try another date.</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {(slots.data ?? []).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={slot === t ? "default" : "outline"}
                      onClick={() => setSlot(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(4)} disabled={!slot}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {step === 4 && service && (
          <StepCard title="Your details" onBack={() => setStep(3)}>
            <Summary service={service} barber={barber} date={date} slot={slot} />
            <div className="mt-6 grid gap-4">
              <Field label="Full name" value={details.name} onChange={(v) => setDetails({ ...details, name: v })} required />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Phone" value={details.phone} onChange={(v) => setDetails({ ...details, phone: v })} required type="tel" />
                <Field label="Email (optional)" value={details.email} onChange={(v) => setDetails({ ...details, email: v })} type="email" />
              </div>
              <div>
                <Label htmlFor="notes" className="mb-1.5 block">Notes (optional)</Label>
                <Textarea id="notes" rows={3} value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                  placeholder="Anything we should know? (style, allergies, etc.)" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={submit} disabled={mutation.isPending}>
                {mutation.isPending ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          </StepCard>
        )}

        {step === 5 && confirmation && service && (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-700">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-semibold">Booking confirmed!</h2>
              <p className="text-muted-foreground">We'll see you soon. Save your reference number:</p>
              <p className="text-3xl font-bold tracking-tight">{confirmation.reference}</p>
              <Summary service={service} barber={barber} date={date} slot={slot} />
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button asChild variant="outline"><Link to="/">Back home</Link></Button>
                <Button onClick={() => navigate({ to: "/my-bookings" })}>View my bookings</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </SiteLayout>
  );
}

function Stepper({ step }: { step: number }) {
  const items = ["Service", "Barber", "Date & time", "Your details"];
  return (
    <div className="mt-6 flex items-center gap-2 text-xs">
      {items.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold",
              active && "border-primary bg-primary text-primary-foreground",
              done && "border-primary bg-primary/10 text-primary",
              !active && !done && "text-muted-foreground",
            )}>{done ? <Check className="h-3 w-3" /> : n}</div>
            <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            {i < items.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

function StepCard({ title, onBack, children }: { title: string; onBack?: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          {onBack && <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ServiceRow({ s, selected, onSelect }: { s: Service; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:border-primary",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div>
        <p className="font-medium">{s.name}</p>
        <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {s.category && <Badge variant="outline" className="text-[10px]">{s.category}</Badge>}
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes} min</span>
        </p>
      </div>
      <span className="text-lg font-semibold">₱{Number(s.price).toFixed(0)}</span>
    </button>
  );
}

function BarberRow({ b, any, selected, onSelect }: { b?: Barber; any?: boolean; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:border-primary",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-muted">
        {any ? (
          <User className="h-5 w-5 text-muted-foreground" />
        ) : b?.avatar_url ? (
          <img src={b.avatar_url} alt={b.name} className="h-full w-full object-cover" />
        ) : (
          <Scissors className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{any ? "Any available barber" : b!.name}</p>
        <p className="text-xs text-muted-foreground">
          {any ? "We'll pick the first available chair for you" : (b!.specialization ?? "Barber")}
        </p>
      </div>
      {!any && b?.rating != null && (
        <span className="flex items-center gap-1 text-sm">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(b.rating).toFixed(1)}
        </span>
      )}
    </button>
  );
}

function Summary({ service, barber, date, slot }: {
  service: Service; barber: Barber | null; date?: Date; slot: string | null;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{service.name}</span></div>
      <div className="mt-1.5 flex justify-between"><span className="text-muted-foreground">Barber</span><span className="font-medium">{barber?.name ?? "Any available"}</span></div>
      {date && <div className="mt-1.5 flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{format(date, "PPP")}</span></div>}
      {slot && <div className="mt-1.5 flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{slot}</span></div>}
      <div className="mt-2 flex justify-between border-t pt-2"><span>Total</span><span className="font-bold">₱{Number(service.price).toFixed(0)}</span></div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}