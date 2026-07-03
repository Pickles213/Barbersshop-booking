import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Clock, Scissors, LogIn } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const { data: rows = [] } = useQuery({
    queryKey: ["queue_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_public")
        .select("*")
        .order("queue_number", { ascending: true });
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

  // Compute position + wait for signed-in user
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
      const aheadWait = ahead.reduce((s, r) => s + (r.duration_minutes ?? 30), 0);
      const currentWait = nowServing ? (nowServing.duration_minutes ?? 30) : 0;
      waitMinutes = aheadWait + currentWait;
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
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Queue</h1>
            <p className="text-sm text-muted-foreground">Updates in real time</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Radio className="h-3 w-3 animate-pulse text-green-500" />
            Live
          </Badge>
        </div>

        {/* Now serving — headline */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-widest">Now serving</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-baseline gap-4">
              <span className="text-7xl font-black tabular-nums leading-none">
                {nowServing ? `#${nowServing.queue_number}` : "—"}
              </span>
              {nowServing && (
                <div className="flex flex-col">
                  <span className="text-lg font-medium">{nowServing.first_name}</span>
                  <Badge className="mt-1 w-fit gap-1"><Scissors className="h-3 w-3" /> In the chair</Badge>
                </div>
              )}
            </div>
            {!nowServing && (
              <p className="mt-2 text-sm text-muted-foreground">No one is being served right now.</p>
            )}
          </CardContent>
        </Card>

        {/* Your spot */}
        {me && myTicket && (
          <Card className="mb-6 border-primary/60 bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-widest text-primary">Your spot</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums text-primary">#{myTicket.queue_number}</span>
                {isUp ? (
                  <span className="text-lg font-semibold">You're up now — head to the chair</span>
                ) : (
                  <div>
                    <p className="text-lg font-semibold">
                      You are <span className="text-primary">{positionLabel}</span> in line
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      About {waitMinutes ?? 0} min wait
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {me && !myTicket && (
          <Card className="mb-6">
            <CardContent className="p-5 text-sm text-muted-foreground">
              You're not in today's queue. Ask the attendant to check you in with your email and we'll show your spot here.
            </CardContent>
          </Card>
        )}

        {!me && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Track your spot</CardTitle>
              <CardDescription>Sign in with Google so we can show your position and wait time on any device.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGoogle} disabled={googleLoading} className="w-full sm:w-auto">
                <LogIn className="mr-2 h-4 w-4" />
                {googleLoading ? "Redirecting…" : "Sign in with Google"}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {waiting.length} {waiting.length === 1 ? "person" : "people"} waiting today. Queue numbers are assigned when you check in and never change.
        </p>
      </div>
    </SiteLayout>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}