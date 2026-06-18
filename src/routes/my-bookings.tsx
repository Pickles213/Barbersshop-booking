import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Clock, Scissors } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

import { SiteLayout } from "@/components/site/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyBookings, cancelMyBooking, fetchServices, fetchBarbers } from "@/lib/customer-api";

export const Route = createFileRoute("/my-bookings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Bookings — Sharp & Co." },
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
    return <SiteLayout><div className="p-12 text-center text-sm text-muted-foreground">Loading…</div></SiteLayout>;
  }
  if (user === null) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Sign in to view your bookings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Don't have an account? You can still book as a guest.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => navigate({ to: "/auth" })}>Sign in</Button>
            <Button asChild variant="outline"><Link to="/book">Book as guest</Link></Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const serviceMap = new Map((services.data ?? []).map((s) => [s.id, s]));
  const barberMap = new Map((barbers.data ?? []).map((b) => [b.id, b]));

  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <h1 className="text-3xl font-bold tracking-tight">My bookings</h1>
          <p className="mt-2 text-muted-foreground">Hello, {user.email}</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl space-y-4 px-4 py-10">
        {bookings.isLoading && <p className="text-sm text-muted-foreground">Loading bookings…</p>}
        {!bookings.isLoading && (bookings.data?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground">No bookings yet.</p>
              <Button asChild className="mt-4"><Link to="/book">Book your first appointment</Link></Button>
            </CardContent>
          </Card>
        )}
        {(bookings.data ?? []).map((b) => {
          const svc = b.service_id ? serviceMap.get(b.service_id) : undefined;
          const brb = b.barber_id ? barberMap.get(b.barber_id) : undefined;
          const upcoming = new Date(`${b.booking_date}T${b.start_time}`) > new Date();
          return (
            <Card key={b.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold">{svc?.name ?? "Service"}</p>
                    <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">with {brb?.name ?? "—"}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(b.booking_date), "PPP")}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{String(b.start_time).slice(0,5)}</span>
                    <span>Ref: <span className="font-mono">{b.reference}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">₱{Number(b.price).toFixed(0)}</span>
                  {upcoming && b.status === "pending" && (
                    <Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(b.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </SiteLayout>
  );
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "confirmed" || s === "completed") return "default";
  if (s === "cancelled" || s === "no_show") return "destructive";
  return "secondary";
}