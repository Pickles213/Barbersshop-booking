import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Users, Clock, Scissors } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/queue")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Live Queue · Southside Barbers" },
      { name: "description", content: "See who's next in line at Southside Barbers, updated in real time." },
    ],
  }),
  component: QueuePage,
});

type QueueRow = {
  id: string;
  queue_number: number | null;
  first_name: string | null;
  status: string;
  created_at: string;
  served_at: string | null;
};

function QueuePage() {
  const qc = useQueryClient();
  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMe(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
    });
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["queue_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_public")
        .select("*")
        .order("queue_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QueueRow[];
    },
    refetchInterval: 30000,
  });

  // Realtime updates on walk_ins → refresh public queue
  useEffect(() => {
    const channel = supabase
      .channel("queue_public_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "walk_ins" },
        () => qc.invalidateQueries({ queryKey: ["queue_public"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Try to identify the current user in the queue (by email match on customer name isn't reliable;
  // we query the authenticated walk_ins row directly).
  const { data: myEntry } = useQuery({
    queryKey: ["my_queue_entry", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const today = new Date();
      const iso = today.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("walk_ins")
        .select("id, queue_number, status, customer_name")
        .gte("created_at", `${iso}T00:00:00Z`)
        .in("status", ["waiting", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return null;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const waiting = rows.filter((r) => r.status === "waiting");
  const inProgress = rows.filter((r) => r.status === "in_progress");
  const nowServing = inProgress[0] ?? null;
  const nextUp = waiting[0] ?? null;

  const myRow =
    me && myEntry && Array.isArray(myEntry)
      ? rows.find((r) =>
          myEntry.some(
            (m) => m.queue_number === r.queue_number && (m.status === "waiting" || m.status === "in_progress"),
          ),
        )
      : null;

  const positionAhead = myRow
    ? waiting.filter((r) => (r.queue_number ?? 0) < (myRow.queue_number ?? 0)).length
    : null;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Queue</h1>
            <p className="text-sm text-muted-foreground">Today's line at Southside Barbers</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Radio className="h-3 w-3 animate-pulse text-green-500" />
            Live
          </Badge>
        </div>

        {myRow && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardDescription>Your spot</CardDescription>
              <CardTitle className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">#{myRow.queue_number}</span>
                <span className="text-base font-normal text-muted-foreground">
                  {myRow.status === "in_progress"
                    ? "You're up now"
                    : positionAhead === 0
                      ? "You're next"
                      : `${positionAhead} ahead of you`}
                </span>
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Now serving</p>
              <p className="mt-1 text-2xl font-bold">
                {nowServing ? `#${nowServing.queue_number} · ${nowServing.first_name}` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next up</p>
              <p className="mt-1 text-2xl font-bold">
                {nextUp ? `#${nextUp.queue_number} · ${nextUp.first_name}` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Waiting ({waiting.length})
            </CardTitle>
            <CardDescription>Auto-updates as customers are served</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Loading queue…</p>}
            {!isLoading && rows.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No customers in line yet today.
              </p>
            )}
            {inProgress.map((r) => (
              <QueueRowItem key={r.id} row={r} state="in_progress" highlight={myRow?.id === r.id} />
            ))}
            {waiting.map((r) => (
              <QueueRowItem key={r.id} row={r} state="waiting" highlight={myRow?.id === r.id} />
            ))}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Walk in and ask the attendant to add you — or{" "}
          <a href="/auth" className="underline underline-offset-2">sign in with Google</a>{" "}
          so we can find you faster next time.
        </p>
      </div>
    </SiteLayout>
  );
}

function QueueRowItem({
  row,
  state,
  highlight,
}: {
  row: QueueRow;
  state: "waiting" | "in_progress";
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-lg border p-3 " +
        (highlight ? "border-primary bg-primary/5 " : "") +
        (state === "in_progress" ? "bg-accent/50" : "")
      }
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
          <span className="text-sm font-bold">#{row.queue_number}</span>
        </div>
        <div>
          <p className="font-medium">{row.first_name ?? "Guest"}</p>
          <p className="text-xs text-muted-foreground">
            {state === "in_progress" ? "In the chair" : "Waiting"}
          </p>
        </div>
      </div>
      {state === "in_progress" ? (
        <Badge className="gap-1"><Scissors className="h-3 w-3" /> Now</Badge>
      ) : (
        <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> In line</Badge>
      )}
    </div>
  );
}