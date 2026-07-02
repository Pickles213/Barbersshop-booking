import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, MapPin, Phone, Scissors, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteLayout } from "@/components/site/site-layout";
import { fetchServices, fetchBarbers, fetchShopSettings } from "@/lib/customer-api";
import { formatTime } from "@/lib/utils";

// trigger

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Southside Barbers — Premium Barber Shop" },
      {
        name: "description",
        content: "Classic cuts, hot-towel shaves and modern styling. Book your appointment online in seconds.",
      },
      { property: "og:title", content: "Southside Barbers — Premium Barber Shop" },
      {
        property: "og:description",
        content: "Classic cuts, hot-towel shaves and modern styling. Book online in seconds.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const barbers = useQuery({ queryKey: ["barbers"], queryFn: fetchBarbers });
  const shop = useQuery({ queryKey: ["shop"], queryFn: fetchShopSettings });

  const featured = (services.data ?? []).slice(0, 3);
  const topBarbers = (barbers.data ?? []).slice(0, 3);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-muted/40 to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <Badge variant="secondary" className="mb-4">
              Walk-ins welcome · Bookings preferred
            </Badge>
            <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
              Look sharp. <span className="text-primary">Feel sharper.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              {shop.data?.shop_name ? `Welcome to ${shop.data.shop_name}.` : "Welcome."} Master barbers, classic
              technique, modern style.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/book">
                  Book an appointment <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/services">View services</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {shop.data?.open_time && shop.data?.close_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {formatTime(shop.data.open_time.slice(0, 5))} –{" "}
                  {formatTime(shop.data.close_time.slice(0, 5))}
                </div>
              )}
              {shop.data?.shop_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {shop.data.shop_address}
                </div>
              )}
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/10 blur-3xl" />
            <div className="grid aspect-square place-items-center rounded-3xl border border-border/60 bg-card shadow-sm">
              <Scissors className="h-32 w-32 text-primary" strokeWidth={1.2} />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Featured services</h2>
            <p className="mt-2 text-muted-foreground">Crafted by experienced barbers.</p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/services">View all</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {featured.map((s) => (
            <Card key={s.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                {s.category && (
                  <Badge variant="outline" className="mb-3">
                    {s.category}
                  </Badge>
                )}
                <h3 className="text-lg font-semibold">{s.name}</h3>
                {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-bold">₱{Number(s.price).toFixed(0)}</span>
                  <span className="text-sm text-muted-foreground">{s.duration_minutes} min</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {services.isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="h-44 animate-pulse" />
              </Card>
            ))}
        </div>
      </section>

      {/* Barbers */}
      <section className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Meet the team</h2>
              <p className="mt-2 text-muted-foreground">Pick your favourite barber.</p>
            </div>
            <Button asChild variant="ghost">
              <Link to="/barbers">View all</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {topBarbers.map((b) => (
              <Card key={b.id} className="overflow-hidden">
                <div className="aspect-[4/3] bg-muted">
                  {b.avatar_url ? (
                    <img src={b.avatar_url} alt={b.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <Scissors className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{b.name}</h3>
                    {b.rating != null && (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {Number(b.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  {b.specialization && <p className="mt-1 text-sm text-muted-foreground">{b.specialization}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Card className="overflow-hidden bg-primary text-primary-foreground">
          <CardContent className="grid gap-6 p-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Ready for a fresh cut?</h2>
              <p className="mt-2 text-primary-foreground/80">
                Pick a service, choose your barber, and lock in your slot.
              </p>
            </div>
            <div className="md:text-right">
              <Button asChild variant="secondary" size="lg">
                <Link to="/book">
                  Book now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" /> Or call us at 09676767676
        </p>
      </section>
    </SiteLayout>
  );
}
