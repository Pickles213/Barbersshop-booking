import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock, MapPin, Phone, Scissors, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/site-layout";
import { fetchServices, fetchBarbers, fetchShopSettings } from "@/lib/customer-api";
import { cn, formatTime } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Southside Barbers — Premium Barbershop Network" },
      {
        name: "description",
        content: "Precision cuts, hot-towel shaves and modern styling. Book your appointment online without unnecessary waiting.",
      },
      { property: "og:title", content: "Southside Barbers — Premium Barbershop Network" },
      {
        property: "og:description",
        content: "Precision cuts, hot-towel shaves and modern styling. Book online without unnecessary waiting.",
      },
    ],
  }),
  component: HomePage,
});

// ─── Slideshow & Portfolio assets ──────────────────────────────────────────────
const HERO_IMAGES = [
  "/images/slide1.png",
  "/images/slide2.png",
  "/images/slide3.png",
  "/images/slide4.png",
  "/images/slide5.png",
];

const PORTFOLIO_FALLBACKS = [
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80",
];

function HomePage() {
  // ── Data queries ──────────────────────────────────────────────────────────
  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const barbers = useQuery({ queryKey: ["barbers"], queryFn: fetchBarbers });
  const shop = useQuery({ queryKey: ["shop"], queryFn: fetchShopSettings });

  // ── Slideshow state ───────────────────────────────────────────────────────
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setActiveSlide((prev) => (prev + 1) % HERO_IMAGES.length), 4500);
    return () => clearTimeout(id);
  }, [activeSlide]);

  const featuredServices = (services.data ?? []).slice(0, 6);
  const topBarbers = (barbers.data ?? []).slice(0, 4);

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Editorial Brutalist Monochrome Layout
          ════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full bg-white dark:bg-zinc-950 text-black dark:text-white pt-10 pb-20 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Top Subhead */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
              [ {shop.data?.shop_name || "SOUTHSIDE BARBERS"} NETWORK ]
            </span>
            <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-wider text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Queue Open
              </span>
              <span>•</span>
              <Link to="/queue" className="underline hover:text-black dark:hover:text-white transition-colors">
                Check wait times ↗
              </Link>
            </div>
          </div>

          {/* Massive Editorial Headline */}
          <div className="my-6">
            <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[11rem] font-black tracking-tighter uppercase leading-[0.88] select-none text-black dark:text-white">
              SOUTHSIDE
            </h1>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-4">
              <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[11rem] font-black tracking-tighter uppercase leading-[0.88] select-none text-zinc-400 dark:text-zinc-600">
                BARBERS.
              </h1>
              <p className="max-w-md text-sm md:text-base text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed pb-3">
                We understand the pace of the city and the needs of its residents. We offer high-quality grooming at an affordable price, without unnecessary waiting. Precision, experience, and results that speak for themselves.
              </p>
            </div>
          </div>

          {/* Editorial Grid / Slider Showcase */}
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Box · Circular Booking CTA */}
            <div className="lg:col-span-4 flex flex-col justify-between h-full bg-zinc-100 dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                  [ FAST ONLINE BOOKING ]
                </span>
                <h3 className="text-2xl font-extrabold uppercase tracking-tight">
                  No queues and no surprises.
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Lock in your slot in under 30 seconds. Choose your master barber, pick your style, and arrive just in time.
                </p>
              </div>

              <div className="mt-10 flex items-center justify-between">
                <Link
                  to="/book"
                  className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-widest uppercase shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <span className="text-center leading-tight">
                    BOOK<br />NOW<br />
                    <ArrowUpRight className="inline h-4 w-4 mt-0.5 stroke-[2.5]" />
                  </span>
                </Link>

                <div className="text-right font-mono text-xs text-zinc-500 space-y-1">
                  <div>OPEN DAILY</div>
                  <div className="font-bold text-black dark:text-white">
                    {shop.data?.open_time ? formatTime(shop.data.open_time.slice(0, 5)) : "09:00"} – {shop.data?.close_time ? formatTime(shop.data.close_time.slice(0, 5)) : "20:00"}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box · Slideshow Banner */}
            <div className="lg:col-span-8 relative h-[380px] sm:h-[460px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
              {HERO_IMAGES.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt="Barbershop showcase"
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out",
                    i === activeSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
                  )}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white z-10">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-300">
                    [ MASTER CRAFTSMANSHIP ]
                  </span>
                  <h4 className="text-xl md:text-2xl font-bold uppercase tracking-tight mt-1">
                    Classic Technique. Modern Style.
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  {HERO_IMAGES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === activeSlide ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          MARQUEE TICKER TAPE
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap animate-marquee">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="mx-4 flex items-center gap-8">
              <span>• HAIRCUT</span>
              <span>• STYLE</span>
              <span>• STANDARD</span>
              <span>• QUALITY</span>
              <span>• RESULT</span>
              <span>• PRECISION</span>
              <span>• SERVICE</span>
              <span>• BEARD SCULPTING</span>
              <span>• HOT TOWEL SHAVE</span>
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ABOUT US & STATISTICS
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white dark:bg-zinc-950 text-black dark:text-white border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Col · Copy & Stats */}
            <div className="lg:col-span-7 space-y-8">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500">
                [ ABOUT US ]
              </span>
              <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight leading-none">
                SOUTHSIDE IS A MODERN BARBERSHOP NETWORK.
              </h2>
              <div className="space-y-4 text-sm md:text-base text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                <p>
                  Since our inception, we have been building the most premier grooming destination in the city. From a single neighborhood chair, we have created a recognizable standard present for men who value their time and appearance.
                </p>
                <p>
                  Everywhere we welcome our clients the exact same way — with a sharp eye, professional technique, and flawless consistency. Growth and belief in people are the foundations of Southside Barbers.
                </p>
              </div>

              {/* Big Number Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="text-4xl sm:text-5xl font-black tracking-tighter">
                    {barbers.data?.length ? barbers.data.length + "+" : "10+"}
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mt-1">
                    Master Barbers
                  </div>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl font-black tracking-tighter">80K+</div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mt-1">
                    Satisfied Clients / Yr
                  </div>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl font-black tracking-tighter">4.9★</div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mt-1">
                    Average Rating
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col · Interior Showcase */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80"
                  alt="Barbershop Interior"
                  className="w-full h-full object-cover filter contrast-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white font-mono text-xs">
                  [ SOUTHSIDE STUDIO · MAKATI ]
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          OUR MISSION — Dark Monochrome Section
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 bg-zinc-950 text-white border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500">
                [ OUR VALUES ]
              </span>
              <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mt-2 text-white">
                OUR MISSION
              </h2>
            </div>
            <p className="max-w-md text-sm text-zinc-400 font-light leading-relaxed">
              Our mission is not only to cut hair, but to deliver a consistent result. Regardless of the location or the barber, the client receives transparent service, precise work, and quality control.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left · Image */}
            <div className="lg:col-span-5">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80"
                  alt="Barber Precision Cut"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right · Numbered Mission Statements */}
            <div className="lg:col-span-7 divide-y divide-zinc-800">
              <div className="py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs font-bold tracking-[0.2em] text-zinc-500">
                    [ 01 ]
                  </span>
                  <h3 className="text-lg font-extrabold uppercase tracking-wide text-white">
                    CONSISTENT RESULTS
                  </h3>
                </div>
                <p className="text-sm text-zinc-400 font-light max-w-xs sm:text-right">
                  We deliver high-quality men's haircuts with guaranteed precision every single time.
                </p>
              </div>

              <div className="py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs font-bold tracking-[0.2em] text-zinc-500">
                    [ 02 ]
                  </span>
                  <h3 className="text-lg font-extrabold uppercase tracking-wide text-white">
                    ONE STANDARD
                  </h3>
                </div>
                <p className="text-sm text-zinc-400 font-light max-w-xs sm:text-right">
                  The same elite level of service, cleanliness, and quality control across all our barbers.
                </p>
              </div>

              <div className="py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs font-bold tracking-[0.2em] text-zinc-500">
                    [ 03 ]
                  </span>
                  <h3 className="text-lg font-extrabold uppercase tracking-wide text-white">
                    RESPECT FOR THE CLIENT
                  </h3>
                </div>
                <p className="text-sm text-zinc-400 font-light max-w-xs sm:text-right">
                  Transparent pricing, zero hidden fees, and punctual scheduling that honors your time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          MOST POPULAR SERVICES — Numbered Interactive Catalog
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 bg-white dark:bg-zinc-950 text-black dark:text-white border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500">
                [ PRICE & CATALOG ]
              </span>
              <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mt-2">
                MOST POPULAR SERVICES
              </h2>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light">
                These are the services most frequently chosen by our clients.
              </p>
              <Link
                to="/services"
                className="text-xs font-mono font-bold uppercase tracking-[0.2em] underline decoration-1 underline-offset-8 hover:text-primary transition-colors"
              >
                [ VIEW ALL SERVICES & PRICING ↗ ]
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Col · Numbered Service Rows */}
            <div className="lg:col-span-8 divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:divide-zinc-800">
              {featuredServices.map((s, idx) => {
                const numStr = (idx + 1).toString().padStart(2, "0");
                return (
                  <Link
                    key={s.id}
                    to="/book"
                    search={{ service: s.id }}
                    className="group py-6 flex items-center justify-between gap-4 transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 px-3 -mx-3 rounded-xl"
                  >
                    <div className="flex items-baseline gap-4 md:gap-6">
                      <span className="font-mono text-xs font-bold tracking-[0.2em] text-zinc-400 dark:text-zinc-600 group-hover:text-black dark:group-hover:text-white transition-colors">
                        [ {numStr} ]
                      </span>
                      <div>
                        <h3 className="text-lg md:text-xl font-extrabold uppercase tracking-tight group-hover:translate-x-1 transition-transform">
                          {s.name}
                        </h3>
                        {s.duration_minutes && (
                          <span className="text-xs font-mono text-zinc-500">
                            {s.duration_minutes} MIN · {s.category || "HAIRCUT"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-base md:text-lg font-bold font-mono">
                        From ₱{Number(s.price).toFixed(0)}
                      </span>
                      <div className="grid h-9 w-9 place-items-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-transparent group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all">
                        <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {services.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="py-6 flex items-center justify-between animate-pulse">
                    <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                ))}
            </div>

            {/* Right Col · Accompanying Photo */}
            <div className="lg:col-span-4 sticky top-28">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80"
                  alt="Barbershop Service"
                  className="w-full h-full object-cover filter contrast-105"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SEE OUR WORK — Dark Portfolio Grid
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500">
                [ PORTFOLIO ]
              </span>
              <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mt-2 text-white">
                SEE OUR WORK
              </h2>
            </div>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-zinc-700 bg-transparent text-white hover:bg-white hover:text-black font-mono text-xs font-bold tracking-[0.2em] uppercase px-6"
            >
              <Link to="/barbers">
                MEET ALL BARBERS <ArrowUpRight className="ml-2 h-4 w-4 stroke-[2.5]" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(topBarbers.length > 0 ? topBarbers : Array.from({ length: 4 })).map((b: any, idx) => {
              const imgSrc = b?.avatar_url || PORTFOLIO_FALLBACKS[idx % PORTFOLIO_FALLBACKS.length];
              return (
                <div
                  key={b?.id || idx}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-xl"
                >
                  <img
                    src={imgSrc}
                    alt={b?.name || `Portfolio ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter contrast-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                  
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                        [ {b?.specialization || "MASTER CUT"} ]
                      </span>
                      <h4 className="text-lg font-bold uppercase tracking-tight mt-0.5">
                        {b?.name || `Style 0${idx + 1}`}
                      </h4>
                    </div>
                    {b?.rating && (
                      <span className="flex items-center gap-1 font-mono text-xs text-zinc-300">
                        <Star className="h-3.5 w-3.5 fill-white text-white" />
                        {Number(b.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BOTTOM CTA BLOCK
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white dark:bg-zinc-950 text-black dark:text-white border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="rounded-3xl bg-black text-white dark:bg-white dark:text-black p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="space-y-3 text-center md:text-left">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                [ READY FOR A FRESH CUT? ]
              </span>
              <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">
                BOOK YOUR HAIRCUT TODAY.
              </h2>
              <p className="text-sm text-zinc-300 dark:text-zinc-700 max-w-md">
                Fast online booking. Pick your favorite barber, select your service, and arrive without the wait.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-black dark:bg-black dark:text-white font-extrabold text-xs tracking-[0.2em] uppercase px-8 h-14 shadow-xl hover:scale-105 transition-all"
              >
                <Link to="/book" className="flex items-center gap-2">
                  BOOK NOW <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                </Link>
              </Button>
              
              {shop.data?.shop_phone && (
                <a
                  href={`tel:${shop.data.shop_phone}`}
                  className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider underline hover:opacity-80 transition-opacity px-4 py-3"
                >
                  <Phone className="h-4 w-4" /> {shop.data.shop_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
