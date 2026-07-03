import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, MapPin, Phone, Scissors, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { SiteLayout } from "@/components/site/site-layout";
import { fetchServices, fetchBarbers, fetchShopSettings } from "@/lib/customer-api";
import { cn, formatTime } from "@/lib/utils";
// trigger build
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

// ─── Slideshow assets ──────────────────────────────────────────────────────────
const HERO_IMAGES = [
  "/images/slide1.png",
  "/images/slide2.png",
  "/images/slide3.png",
  "/images/slide4.png",
  "/images/slide5.png",
];

// ─── Page component ────────────────────────────────────────────────────────────
function HomePage() {
  // ── Data queries (untouched) ──────────────────────────────────────────────
  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const barbers = useQuery({ queryKey: ["barbers"], queryFn: fetchBarbers });
  const shop = useQuery({ queryKey: ["shop"], queryFn: fetchShopSettings });

  // ── Slideshow state (untouched) ───────────────────────────────────────────
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setActiveSlide((prev) => (prev + 1) % HERO_IMAGES.length), 4000);
    return () => clearTimeout(id);
  }, [activeSlide]);

  const featured = (services.data ?? []).slice(0, 3);
  const topBarbers = (barbers.data ?? []).slice(0, 3);

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Industrial monochrome, z-stack fixed
          z-0  → slide images (always above section bg)
          z-10 → gradient vignette masks
          z-20 → text, CTAs, nav arrows
          ════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full h-[85vh] bg-zinc-950 overflow-hidden flex items-center">
        {/* ── z-0 · Crossfade slide images ─────────────────────────────── */}
        <div className="absolute inset-0 z-0">
          {HERO_IMAGES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-in-out",
                i === activeSlide ? "opacity-100" : "opacity-0",
              )}
            />
          ))}
        </div>

        {/* ── z-10 · Left-to-right vignette (text side stays dark) ──────── */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        {/* ── z-10 · Top-to-bottom fade (merges cleanly into page below) ── */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />

        {/* ── z-10 · Global darkening tint (image-agnostic legibility) ──── */}
        <div className="absolute inset-0 z-10 bg-black/30" />

        {/* ── z-20 · Text & CTAs ───────────────────────────────────────── */}
        <div className="relative z-20 flex flex-col justify-center h-full px-6 md:px-16 max-w-4xl text-white">
          {/* Eye-brow label */}
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            Walk-ins welcome · Bookings preferred
          </div>

          {/* Main headline — crisp white, no tints */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-white drop-shadow-lg">
            Look sharp. <span className="text-white">Feel sharper.</span>
          </h1>

          {/* Sub-copy — metallic silver/zinc */}
          <p className="mt-5 max-w-md text-base md:text-lg text-zinc-400 leading-relaxed font-light tracking-wide">
            {shop.data?.shop_name ? `Welcome to ${shop.data.shop_name}.` : "Welcome."} Master barbers, classic
            technique, modern style.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap gap-4">
            {/* Primary — solid white, black text */}
            <Button
              asChild
              size="lg"
              className={cn(
                "bg-white text-black font-bold",
                "hover:bg-zinc-100",
                "hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out",
                "motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
              )}
            >
              <Link to="/book">
                Book an appointment <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            {/* Secondary — ghost with white border */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                "border border-white/40 bg-transparent text-white",
                "hover:bg-white/10 hover:border-white/60",
                "hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out",
                "motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
              )}
            >
              <Link to="/services">View services</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                "border border-white/40 bg-transparent text-white",
                "hover:bg-white/10 hover:border-white/60",
                "hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out",
                "motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
              )}
            >
              <Link to="/queue">Check the live queue</Link>
            </Button>
          </div>

          {/* Shop meta — hours & address */}
          {(shop.data?.open_time || shop.data?.shop_address) && (
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-zinc-500 font-light tracking-wide">
              {shop.data?.open_time && shop.data?.close_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  {formatTime(shop.data.open_time.slice(0, 5))} – {formatTime(shop.data.close_time.slice(0, 5))}
                </div>
              )}
              {shop.data?.shop_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  {shop.data.shop_address}
                </div>
              )}
            </div>
          )}

          {/* Slide dot indicators — monochrome white */}
          <div className="mt-10 flex items-center gap-2">
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "rounded-full transition-all duration-300 ease-out",
                  i === activeSlide ? "w-7 h-[3px] bg-white" : "w-3 h-[3px] bg-white/30 hover:bg-white/55",
                )}
              />
            ))}
          </div>
        </div>

        {/* ── z-20 · Prev / Next arrow controls ────────────────────────── */}
        <button
          onClick={() => setActiveSlide((prev) => (prev - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 z-20",
            "flex h-10 w-10 items-center justify-center rounded-full",
            "border border-white/20 bg-black/40 text-white text-xl backdrop-blur-sm",
            "hover:bg-black/60 hover:border-white/40 hover:scale-110",
            "active:scale-95 transition-all duration-200",
          )}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          onClick={() => setActiveSlide((prev) => (prev + 1) % HERO_IMAGES.length)}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 z-20",
            "flex h-10 w-10 items-center justify-center rounded-full",
            "border border-white/20 bg-black/40 text-white text-xl backdrop-blur-sm",
            "hover:bg-black/60 hover:border-white/40 hover:scale-110",
            "active:scale-95 transition-all duration-200",
          )}
          aria-label="Next slide"
        >
          ›
        </button>
      </section>

      {/* ── Featured Services ─────────────────────────────────────────────── */}
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
            <Card
              key={s.id}
              className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0"
            >
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

      {/* ── Meet the Team ─────────────────────────────────────────────────── */}
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
              <Card
                key={b.id}
                className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {b.avatar_url ? (
                    <img
                      src={b.avatar_url}
                      alt={b.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
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
                        <Star className="h-3.5 w-3.5 fill-zinc-400 text-zinc-400" />
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

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
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
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="transition-all duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100"
              >
                <Link to="/book">
                  Book now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        {shop.data?.shop_phone && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" /> Or call us at {shop.data.shop_phone}
          </p>
        )}
      </section>
    </SiteLayout>
  );
}
