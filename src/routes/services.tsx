import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { fetchServices, type Service } from "@/lib/customer-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Price List & Services — Southside Barbers" },
      { name: "description", content: "Transparent pricing, skilled barbers. Pick a service and book online in seconds." },
      { property: "og:title", content: "Price List & Services — Southside Barbers" },
      { property: "og:description", content: "Transparent pricing, skilled barbers. Pick a service and book online in seconds." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["services"], queryFn: fetchServices });

  const byCategory = (data ?? []).reduce<Record<string, Service[]>>((acc, s) => {
    const key = s.category || "HAIRCUT";
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Exact Editorial Price List Layout
          ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-zinc-950 text-black dark:text-white pt-16 pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
            [ SERVICES & PRICING ]
          </span>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-tighter uppercase leading-[0.85] select-none text-black dark:text-white">
              PRICE LIST
            </h1>
            <p className="max-w-sm text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-light leading-relaxed pb-3">
              Transparent pricing, skilled barbers. Pick a service and book online in seconds — no phone tag required.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BLACK MARQUEE STRIP ACROSS FULL WIDTH
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-t border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap justify-around sm:justify-between px-6 max-w-7xl mx-auto">
          <span>HAIRCUT</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>FADE</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>SHAVE</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>PRECISION</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>STANDARD</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>RESULT</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SERVICES LIST — Category Dividers & Minimalist Rows
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-zinc-950 text-black dark:text-white min-h-[600px]">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          {isLoading && (
            <div className="space-y-8 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-16 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
                  <div className="h-16 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && (data?.length ?? 0) === 0 && (
            <div className="text-center py-24 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-12">
              <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
                [ NO SERVICES LOADED YET ]
              </p>
            </div>
          )}

          <div className="space-y-20">
            {Object.entries(byCategory).map(([cat, items], catIdx) => {
              const catNum = (catIdx + 1).toString().padStart(2, "0");
              return (
                <div key={cat} className="space-y-6">
                  {/* Category Header Row */}
                  <div className="flex items-center gap-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
                      {catNum} — {cat}
                    </span>
                  </div>

                  {/* Service Rows */}
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                    {items.map((s, itemIdx) => {
                      const itemNum = (itemIdx + 1).toString().padStart(2, "0");
                      return (
                        <Link
                          key={s.id}
                          to="/book"
                          search={{ service: s.id } as never}
                          className={cn(
                            "group py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300",
                            "hover:bg-zinc-50 dark:hover:bg-zinc-900/40 px-4 -mx-4 rounded-2xl"
                          )}
                        >
                          {/* Left: Number + Title + Description */}
                          <div className="flex items-baseline gap-6 sm:gap-8 max-w-xl">
                            <span className="font-mono text-xs font-bold tracking-[0.15em] text-zinc-400 dark:text-zinc-600 group-hover:text-black dark:group-hover:text-white transition-colors">
                              [{itemNum}]
                            </span>
                            <div>
                              <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight text-black dark:text-white group-hover:translate-x-1 transition-transform">
                                {s.name}
                              </h3>
                              {s.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
                                  {s.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Duration + Price + Circle CTA Button (Inverting Color on Hover to Match Home!) */}
                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 pl-12 sm:pl-0">
                            {s.duration_minutes && (
                              <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                                {s.duration_minutes} min
                              </span>
                            )}

                            <div className="flex items-baseline gap-1.5 font-mono whitespace-nowrap">
                              <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
                                FIXED
                              </span>
                              <span className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
                                ₱{Number(s.price).toFixed(0)}
                              </span>
                            </div>

                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white dark:bg-zinc-900 text-black dark:text-white border border-zinc-200 dark:border-zinc-800 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black group-hover:scale-110 active:scale-95 transition-all shadow-sm">
                              <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}