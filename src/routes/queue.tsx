import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Clock, Scissors, LogIn, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Live Queue · Southside Barbers" },
      { name: "description", content: "See who's being served right now and track your spot in real time." },
    ],
  }),
  component: QueuePage,
});

type PublicRow = {
  id: string;
  queue_number: number | null;
  first_name: string | null;
  status: string;
  created_at: string;
  served_at: string | null;
  service_id: string | null;
  duration_minutes: number;
};

type MyTicket = {
  id: string;
  queue_number: number | null;
  status: string;
  service_id: string | null;
  created_at: string;
};

function QueuePage() {
  const qc = useQueryClient();
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMe(data.user ? { id: data.user.id } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setMe(session?.user ? { id: session.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["queue_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_public_queue");
      if (error) throw error;
      return (data ?? []) as PublicRow[];
    },
    refetchInterval: 30000,
  });

  const { data: myTicket } = useQuery<MyTicket | null>({
    queryKey: ["my_ticket", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const iso = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("walk_ins")
        .select("id, queue_number, status, service_id, created_at")
        .eq("user_id", me!.id)
        .gte("created_at", `${iso}T00:00:00Z`)
        .in("status", ["waiting", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data as MyTicket) ?? null;
    },
    refetchInterval: 30000,
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("queue_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "walk_ins" }, () => {
        qc.invalidateQueries({ queryKey: ["queue_public"] });
        qc.invalidateQueries({ queryKey: ["my_ticket"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const inProgress = rows.filter((r) => r.status === "in_progress");
  const waiting = rows.filter((r) => r.status === "waiting");
  const nowServing = inProgress[0] ?? null;

  const getWaitTimes = (
    waitingList: PublicRow[],
    inProgressList: PublicRow[],
    bCount: number
  ) => {
    const servers = Array(Math.max(1, bCount)).fill(0);
    for (let i = 0; i < Math.min(servers.length, inProgressList.length); i++) {
      servers[i] = inProgressList[i].duration_minutes ?? 30;
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
      servers[minIdx] += r.duration_minutes ?? 30;
    }

    return waitTimesMap;
  };

  const barberCount = Math.max(1, barbers.length);
  const waitTimesMap = getWaitTimes(waiting, inProgress, barberCount);

  const getWaitTimeForQueueNumber = (qNum: number) => {
    const r = waiting.find((x) => x.queue_number === qNum);
    if (!r) return 0;
    return waitTimesMap[r.id] ?? 0;
  };

  const avgWait = waiting.length
    ? Math.round(waiting.reduce((sum, r) => sum + (waitTimesMap[r.id] ?? 0), 0) / waiting.length)
    : 0;

  let positionLabel: string | null = null;
  let waitMinutes: number | null = null;
  let isUp = false;

  if (myTicket && myTicket.queue_number != null) {
    if (myTicket.status === "in_progress") {
      isUp = true;
    } else {
      const ahead = waiting.filter((r) => (r.queue_number ?? 0) < (myTicket.queue_number ?? 0));
      const pos = ahead.length + 1;
      positionLabel = ordinal(pos);
      waitMinutes = getWaitTimeForQueueNumber(myTicket.queue_number);
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/queue`,
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error(result.error.message ?? "Google sign-in failed");
    }
  };

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Editorial Brutalist Typography
          ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-zinc-950 text-black dark:text-white pt-16 pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
              [ REAL-TIME WALK-IN TRACKER ]
            </span>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider w-fit">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
              <span>LIVE BROADCAST · UPDATES EVERY 30S</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-tighter uppercase leading-[0.85] select-none text-black dark:text-white">
              LIVE QUEUE
            </h1>
            <p className="max-w-md text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-light leading-relaxed pb-3">
              See who is in the chair right now and track your walk-in position in real time. Never sit waiting in a crowded lobby again — monitor your spot from your phone anywhere.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BLACK MARQUEE STRIP ACROSS FULL WIDTH
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-t border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap justify-around sm:justify-between px-6 max-w-7xl mx-auto">
          <span>NOW SERVING</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>ZERO LOBBY LAG</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>REAL-TIME POSITION</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>WALK-IN TRACKER</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>SOUTHSIDE BARBERS</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          QUEUE STATUS CARDS — High Contrast Editorial Showcase
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-zinc-950 text-black dark:text-white min-h-[600px]">
        <div className="mx-auto max-w-5xl px-6 md:px-10 space-y-12">
          
          {/* 1. NOW SERVING CARD */}
          <div className="rounded-3xl bg-zinc-950 text-white dark:bg-zinc-900 border-2 border-black dark:border-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-emerald-400">
                  <Scissors className="h-4 w-4 animate-spin-slow" />
                  <span>[ CURRENTLY IN THE CHAIR ]</span>
                </div>
                <div className="flex flex-col gap-4">
                  {inProgress.length > 0 ? (
                    inProgress.map((p) => (
                      <div key={p.id} className="flex items-baseline gap-4">
                        <span className={cn(
                          "font-black font-mono tracking-tighter tabular-nums text-white",
                          inProgress.length > 1
                            ? "text-4xl sm:text-5xl"
                            : "text-7xl sm:text-[5.5rem]"
                        )}>
                          #{p.queue_number}
                        </span>
                        <div className="space-y-0.5">
                          <h3 className={cn(
                            "font-extrabold uppercase tracking-tight text-zinc-100",
                            inProgress.length > 1
                              ? "text-lg sm:text-xl"
                              : "text-2xl sm:text-3xl"
                          )}>
                            {p.first_name || "Guest"}
                          </h3>
                          <p className="text-xs font-mono text-zinc-400">
                            ~{p.duration_minutes || 30} mins
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-baseline gap-6">
                      <span className="text-7xl sm:text-[5.5rem] font-black font-mono tracking-tighter tabular-nums text-zinc-600">—</span>
                      <div className="space-y-1">
                        <h3 className="text-2xl sm:text-3xl font-bold text-zinc-400 uppercase tracking-tight">
                          Chair Available
                        </h3>
                        <p className="text-sm font-mono text-zinc-500">
                          No active walk-in customer in the chair right now.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t md:border-t-0 md:border-l border-zinc-800 pt-6 md:pt-0 md:pl-10 text-left md:text-right font-mono">
                <div className="text-xs uppercase tracking-widest text-zinc-400">Total Waiting</div>
                <div className="text-4xl sm:text-5xl font-black text-white mt-1">
                  {waiting.length} {waiting.length === 1 ? "Person" : "People"}
                </div>
                <div className="text-xs text-zinc-400 mt-2">
                  Average wait: ~{avgWait} mins
                </div>
              </div>
            </div>
          </div>

          {/* 2. YOUR SPOT CARD (When Logged In & Has Ticket) */}
          {me && myTicket && (
            <div className="rounded-3xl bg-emerald-500/10 border-2 border-emerald-500 p-8 sm:p-10 text-black dark:text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                    [ YOUR WALK-IN TICKET ]
                  </span>
                  <div className="flex items-baseline gap-4">
                    <span className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                      #{myTicket.queue_number}
                    </span>
                    <div>
                      {isUp ? (
                        <h4 className="text-2xl sm:text-3xl font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
                          YOU'RE UP! STEP TO THE CHAIR ✂️
                        </h4>
                      ) : (
                        <div>
                          <h4 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                            You are <span className="underline decoration-emerald-500">{positionLabel}</span> in line
                          </h4>
                          <p className="flex items-center gap-2 text-sm font-mono text-zinc-600 dark:text-zinc-400 mt-1">
                            <Clock className="h-4 w-4 text-emerald-500" />
                            Estimated wait time: ~{waitMinutes ?? 0} minutes
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-widest">
                    <CheckCircle2 className="h-4 w-4" /> Confirmed
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. NOT IN QUEUE MESSAGE (When Logged In & No Ticket) */}
          {me && !myTicket && (
            <div className="rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-3">
              <AlertCircle className="h-8 w-8 mx-auto text-zinc-400" />
              <h4 className="text-lg font-bold uppercase tracking-wide">No Active Walk-in Ticket Today</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto font-light">
                You are currently signed in, but don't have an active walk-in ticket for today. Ask our front desk attendant to check you in with your email and your live queue number will appear here automatically!
              </p>
            </div>
          )}

          {/* 4. TRACK YOUR SPOT LOGIN (When Not Logged In) */}
          {!me && (
            <div className="rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-300 dark:border-zinc-800 p-8 sm:p-12 text-center space-y-6">
              <div className="space-y-2 max-w-lg mx-auto">
                <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400">
                  [ REMOTE MONITORING ]
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                  WANT TO TRACK YOUR WALK-IN TICKET?
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
                  If you checked in at the shop with your email, sign in with your Google account below to monitor your line position and countdown timer from anywhere.
                </p>
              </div>

              <Button
                onClick={handleGoogle}
                disabled={googleLoading}
                size="lg"
                className={cn(
                  "rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.2em] uppercase px-8 h-13 shadow-xl",
                  "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all"
                )}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {googleLoading ? "CONNECTING TO GOOGLE..." : "SIGN IN WITH GOOGLE"} <ArrowUpRight className="ml-1 h-4 w-4 stroke-[2.5]" />
              </Button>
            </div>
          )}

          {/* 5. WAITING LIST PREVIEW */}
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-4">
              <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
                [ CURRENT WAITING LIST ]
              </span>
              <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                {waiting.length} {waiting.length === 1 ? "Person" : "People"} in line
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center font-mono text-xs text-zinc-400 animate-pulse uppercase tracking-widest">
                [ FETCHING LIVE QUEUE DATA... ]
              </div>
            ) : waiting.length === 0 ? (
              <div className="py-16 text-center border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
                  [ WAITING ROOM IS EMPTY ]
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Walk in right now for zero lobby wait time!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {waiting.map((r, i) => (
                  <div
                    key={r.id}
                    className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-2xl font-black text-black dark:text-white">
                        #{r.queue_number}
                      </span>
                      <span className="font-bold uppercase text-sm text-zinc-700 dark:text-zinc-300">
                        {r.first_name || "Guest"}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-zinc-400">
                      ~{r.duration_minutes || 30}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}