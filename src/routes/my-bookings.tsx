import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  Scissors,
  ArrowUpRight,
  LogIn,
  XCircle,
  CheckCircle2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

import { SiteLayout } from "@/components/site/site-layout";
import { formatTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMyBookings,
  cancelMyBooking,
  fetchServices,
  fetchBarbers,
  type MyBooking,
} from "@/lib/customer-api";

export const Route = createFileRoute("/my-bookings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Bookings — Southside Barbers" },
      { name: "description", content: "View and manage your upcoming appointments." },
    ],
  }),
  component: MyBookingsPage,
});

function MyBookingsPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const bookings = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: () => fetchMyBookings(user!.id),
    enabled: !!user,
  });
  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const barbers = useQuery({ queryKey: ["barbers"], queryFn: fetchBarbers });

  const cancel = useMutation({
    mutationFn: cancelMyBooking,
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (user === undefined) {
    return (
      <SiteLayout>
        <div className="min-h-[500px] flex items-center justify-center bg-white dark:bg-zinc-950">
          <div className="font-mono text-xs uppercase tracking-widest text-zinc-500 animate-pulse">
            [ LOADING ACCOUNT PORTAL... ]
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (user === null) {
    return (
      <SiteLayout>
        <section className="bg-white dark:bg-zinc-950 text-black dark:text-white py-24 min-h-[70vh] flex items-center">
          <div className="mx-auto max-w-md px-6 text-center space-y-6">
            <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500 block">
              [ SECURE ACCESS ]
            </span>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black dark:text-white leading-none">
              SIGN IN REQUIRED
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
              To view and manage your booked appointments, active queue tickets, or profile
              settings, please authenticate your account first.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate({ to: "/auth" })}
                className={cn(
                  "rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.15em] uppercase px-6 h-12 shadow-lg",
                  "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all",
                )}
              >
                <LogIn className="mr-2 h-4 w-4" /> SIGN IN NOW
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-zinc-300 dark:border-zinc-700 font-mono text-xs font-bold tracking-widest uppercase px-6 h-12 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
              >
                <Link to="/book">BOOK AS GUEST ↗</Link>
              </Button>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const serviceMap = new Map((services.data ?? []).map((s) => [s.id, s]));
  const barberMap = new Map((barbers.data ?? []).map((b) => [b.id, b]));

  // Prefer the itemized booking_services rows (multi-service bookings); fall back to the
  // single legacy service_id for bookings created before multi-service support existed.
  const serviceNamesFor = (b: MyBooking) => {
    if (b.booking_services && b.booking_services.length > 0) {
      return b.booking_services.map((line) => line.service_name);
    }
    const svc = b.service_id ? serviceMap.get(b.service_id) : undefined;
    return svc ? [svc.name] : [];
  };

  const upcomingBookings = (bookings.data ?? []).filter((b) => {
    try {
      return new Date(`${b.booking_date}T${b.start_time}`) > new Date();
    } catch {
      return true;
    }
  });

  const pastBookings = (bookings.data ?? []).filter((b) => {
    try {
      return new Date(`${b.booking_date}T${b.start_time}`) <= new Date();
    } catch {
      return false;
    }
  });

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Editorial Brutalist Typography
          ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-zinc-950 text-black dark:text-white pt-16 pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
            [ APPOINTMENT HISTORY ]
          </span>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[9.5rem] font-black tracking-tighter uppercase leading-[0.85] select-none text-black dark:text-white">
                MY BOOKINGS
              </h1>
              <p className="mt-4 font-mono text-xs uppercase tracking-wider text-zinc-400">
                ACTIVE PORTAL:{" "}
                <span className="text-black dark:text-white font-bold">{user.email}</span>
              </p>
            </div>
            <Button
              asChild
              className={cn(
                "rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.2em] uppercase px-8 h-13 shadow-xl lg:mb-3",
                "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all",
              )}
            >
              <Link to="/book" className="flex items-center gap-1.5">
                BOOK NEW APPOINTMENT <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BLACK MARQUEE STRIP ACROSS FULL WIDTH
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-t border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap justify-around sm:justify-between px-6 max-w-7xl mx-auto">
          <span>CONFIRMED SLOTS</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>EASY RESCHEDULING</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>COMPLETED HISTORY</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>SOUTHSIDE BARBERS</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BOOKINGS LIST — High Contrast Row Layout
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-zinc-950 text-black dark:text-white min-h-[500px]">
        <div className="mx-auto max-w-4xl px-6 md:px-10 space-y-16">
          {bookings.isLoading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-20 bg-zinc-100 dark:bg-zinc-900 rounded-2xl" />
              <div className="h-20 bg-zinc-100 dark:bg-zinc-900 rounded-2xl" />
            </div>
          )}

          {/* UPCOMING APPOINTMENTS */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-black dark:border-white pb-3 font-mono text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
              <CalendarDays className="h-4 w-4 text-black dark:text-white" />
              <span>[ UPCOMING APPOINTMENTS ]</span>
            </div>

            {!bookings.isLoading && upcomingBookings.length === 0 && (
              <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-3">
                <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
                  [ NO UPCOMING RESERVATIONS ]
                </p>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Need a trim? Browse our list of master services and choose your favorite barber.
                </p>
              </div>
            )}

            {!bookings.isLoading && upcomingBookings.length > 0 && (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                {upcomingBookings.map((b) => {
                  const svcNames = serviceNamesFor(b);
                  const brb = b.barber_id ? barberMap.get(b.barber_id) : undefined;
                  const canCancel = b.status === "pending";

                  return (
                    <div
                      key={b.id}
                      className={cn(
                        "group py-6 px-4 -mx-4 rounded-2xl transition-all duration-300",
                        "hover:bg-zinc-50 dark:hover:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6",
                      )}
                    >
                      {/* Left Block: Service & Barber Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center flex-wrap gap-2.5">
                          <Scissors className="h-4 w-4 text-primary" />
                          <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
                            {svcNames.length > 0 ? svcNames.join(" + ") : "CUSTOM SERVICE"}
                          </h3>
                          <span
                            className={cn(
                              "font-mono text-[10px] font-bold uppercase px-2 py-0.5 border",
                              b.status === "pending" &&
                                "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
                              b.status === "confirmed" &&
                                "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                              b.status === "completed" &&
                                "bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400",
                              (b.status === "cancelled" || b.status === "no_show") &&
                                "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
                            )}
                          >
                            [ {b.status} ]
                          </span>
                        </div>

                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          Barber:{" "}
                          <span className="font-bold text-black dark:text-white">
                            {brb?.name ?? "Any Available"}
                          </span>
                        </p>

                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {format(new Date(b.booking_date), "MMMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(String(b.start_time).slice(0, 5))}
                          </span>
                          <span>
                            REF:{" "}
                            <span className="font-bold text-black dark:text-white">
                              {b.reference}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Right Block: Price & Cancellation Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-baseline gap-1 font-mono">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            TOTAL
                          </span>
                          <span className="text-xl font-black text-black dark:text-white">
                            ₱{Number(b.price).toFixed(0)}
                          </span>
                        </div>

                        {canCancel && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(b.id)}
                            className={cn(
                              "rounded-full border-red-200 text-red-600 dark:border-red-950 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-950 font-mono text-[10px] font-bold uppercase px-4 h-9 tracking-wider transition-all",
                            )}
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> CANCEL
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PAST APPOINTMENTS */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-black dark:border-white pb-3 font-mono text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
              <History className="h-4 w-4 text-black dark:text-white" />
              <span>[ APPOINTMENT ARCHIVE ]</span>
            </div>

            {!bookings.isLoading && pastBookings.length === 0 && (
              <div className="py-8 text-center text-xs font-mono text-zinc-400 uppercase tracking-widest">
                [ ARCHIVE IS EMPTY ]
              </div>
            )}

            {!bookings.isLoading && pastBookings.length > 0 && (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 opacity-70 hover:opacity-100 transition-opacity">
                {pastBookings.map((b) => {
                  const svcNames = serviceNamesFor(b);
                  const brb = b.barber_id ? barberMap.get(b.barber_id) : undefined;

                  return (
                    <div
                      key={b.id}
                      className={cn(
                        "group py-5 px-4 -mx-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6",
                      )}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center flex-wrap gap-2.5">
                          <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                          <h4 className="text-base font-bold uppercase tracking-tight text-zinc-700 dark:text-zinc-300">
                            {svcNames.length > 0 ? svcNames.join(" + ") : "CUSTOM SERVICE"}
                          </h4>
                          <span
                            className={cn(
                              "font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 border bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400",
                            )}
                          >
                            [ {b.status} ]
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-zinc-500">
                          <span>Barber: {brb?.name ?? "Any Available"}</span>
                          <span className="flex items-center gap-0.5">
                            <CalendarDays className="h-3 w-3" />{" "}
                            {format(new Date(b.booking_date), "MMM d, yyyy")}
                          </span>
                          <span>REF: {b.reference}</span>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1 font-mono shrink-0 pl-10 sm:pl-0">
                        <span className="text-[10px] text-zinc-400">PAID</span>
                        <span className="text-base font-bold text-zinc-600 dark:text-zinc-400">
                          ₱{Number(b.price).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
