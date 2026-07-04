import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Star, Image as ImageIcon, Award, Clock } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchBarbers, fetchBarberPortfolio, type Barber } from "@/lib/customer-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barbers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Master Barbers — Southside Barbers" },
      { name: "description", content: "Meet our master craftsmen. Browse specialties, years of experience and portfolio work." },
      { property: "og:title", content: "Master Barbers — Southside Barbers" },
      { property: "og:description", content: "Meet our master craftsmen. Browse specialties, years of experience and portfolio work." },
    ],
  }),
  component: BarbersPage,
});

const PORTFOLIO_FALLBACKS = [
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80",
];

function BarbersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["barbers"], queryFn: fetchBarbers });
  const [openBarber, setOpenBarber] = useState<Barber | null>(null);

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Editorial Brutalist Typography
          ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-zinc-950 text-black dark:text-white pt-16 pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
            [ SOUTHSIDE BARBERSHOP TEAM ]
          </span>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[9.5rem] font-black tracking-tighter uppercase leading-[0.85] select-none text-black dark:text-white">
              MASTER CUTS
            </h1>
            <p className="max-w-md text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-light leading-relaxed pb-3">
              Each barber brings years of precision technique, individual style, and dedication to the craft. Meet our craftsmen below and tap any profile to view their work or book directly.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BLACK MARQUEE STRIP ACROSS FULL WIDTH
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-t border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap justify-around sm:justify-between px-6 max-w-7xl mx-auto">
          <span>MASTER BARBERS</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>SKIN FADE SPECIALISTS</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>BEARD SCULPTING</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>PRECISION</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>CLASSIC TECHNIQUE</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BARBERS SHOWCASE — Compact 4-Column Grid (No Overlapping at 100% Zoom!)
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-zinc-950 text-black dark:text-white min-h-[600px]">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-[4/5] w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
                  <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-12 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && (data?.length ?? 0) === 0 && (
            <div className="text-center py-24 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-12">
              <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
                [ NO BARBERS LOADED YET ]
              </p>
            </div>
          )}

          {/* Compact 4-Column Grid fits all 4 barbers cleanly side-by-side without overflowing or feeling oversized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {(data ?? []).map((b, idx) => {
              const numStr = (idx + 1).toString().padStart(2, "0");
              const imgSrc = b.avatar_url || PORTFOLIO_FALLBACKS[idx % PORTFOLIO_FALLBACKS.length];
              const firstName = b.name.split(" ")[0];

              return (
                <div
                  key={b.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl overflow-hidden",
                    "bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800",
                    "hover:border-black dark:hover:border-white hover:shadow-xl transition-all duration-300"
                  )}
                >
                  {/* Compact Image Container */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-900">
                    <img
                      src={imgSrc}
                      alt={b.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 filter contrast-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                    {/* Top Tag */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10 font-mono text-[11px]">
                      <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 border border-white/20 uppercase tracking-widest font-bold">
                        [ {numStr} ]
                      </span>
                      {b.rating != null && (
                        <span className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-2.5 py-1 border border-white/20">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-extrabold">{Number(b.rating).toFixed(1)}</span>
                        </span>
                      )}
                    </div>

                    {/* Bottom Image Overlay Text */}
                    <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-bold block truncate">
                        [ {b.specialization || "MASTER CUTS"} ]
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight mt-0.5 truncate">
                        {b.name}
                      </h3>
                    </div>
                  </div>

                  {/* Compact Bio & Details Content */}
                  <div className="p-5 sm:p-6 flex flex-1 flex-col justify-between gap-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                        {b.experience_years != null && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold uppercase tracking-wider">
                            <Award className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> {b.experience_years} YRS
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold uppercase tracking-wider">
                          <Clock className="h-3 w-3 text-primary" /> FULL-TIME
                        </span>
                      </div>

                      {b.bio ? (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-light leading-relaxed line-clamp-3">
                          {b.bio}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500 font-light italic line-clamp-3">
                          Specializing in precision scissor cuts, skin fades, and traditional hot-towel razor shaves.
                        </p>
                      )}
                    </div>

                    {/* Compact Stacked Action Buttons */}
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                      <Button
                        asChild
                        size="sm"
                        className={cn(
                          "w-full rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.15em] uppercase h-11 shadow-md",
                          "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        )}
                      >
                        <Link to="/book" search={{ barber: b.id } as never} className="flex items-center justify-center gap-1.5">
                          BOOK {firstName.toUpperCase()} <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenBarber(b)}
                        className="w-full rounded-full border-zinc-300 dark:border-zinc-700 font-mono text-[11px] font-bold tracking-widest uppercase h-9 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                      >
                        <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> [ PORTFOLIO ]
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BOTTOM CTA — Any Available Barber
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-zinc-950 text-white border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400">
                [ FLEXIBLE SCHEDULING ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
                NOT SURE WHO TO CHOOSE?
              </h2>
              <p className="text-sm text-zinc-400 max-w-md font-light">
                Let our smart booking system match you with the first available master barber at your preferred time slot.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-black hover:bg-zinc-200 font-extrabold text-xs tracking-[0.2em] uppercase px-8 h-14 shadow-xl hover:scale-105 transition-all shrink-0"
            >
              <Link to="/book" className="flex items-center gap-2">
                BOOK ANY BARBER <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <PortfolioDialog barber={openBarber} onClose={() => setOpenBarber(null)} />
    </SiteLayout>
  );
}

function PortfolioDialog({ barber, onClose }: { barber: Barber | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["portfolio", barber?.id],
    queryFn: () => fetchBarberPortfolio(barber!.id),
    enabled: !!barber,
  });

  return (
    <Dialog open={!!barber} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl bg-white dark:bg-zinc-950 text-black dark:text-white border border-zinc-200 dark:border-zinc-800 p-8 sm:p-10 rounded-3xl">
        <DialogHeader className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 font-bold">
            [ PORTFOLIO WORK ]
          </span>
          <DialogTitle className="text-3xl sm:text-4xl font-black uppercase tracking-tight mt-1">
            {barber?.name} — Master Cuts
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="py-16 text-center text-sm font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
            [ LOADING PORTFOLIO IMAGES... ]
          </div>
        )}

        {data && data.length === 0 && (
          <div className="py-16 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl">
            <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
              [ NO PORTFOLIO IMAGES UPLOADED YET ]
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Check back soon or view their work on Instagram.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 pt-6 max-h-[65vh] overflow-y-auto pr-2">
          {(data ?? []).map((img, i) => (
            <div
              key={img.id || i}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md"
            >
              <img
                src={img.image_url}
                alt={img.caption || `Cut ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5">
                {img.caption && (
                  <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    [ {img.caption} ]
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}