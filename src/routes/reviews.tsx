import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Star, Search } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BRANDING } from "@/config/branding";

export const Route = createFileRoute("/reviews")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Customer Reviews — ${BRANDING.name}` },
      { name: "description", content: `What our clients say about their experience at ${BRANDING.name}. Authentic, verified feedback.` },
      { property: "og:title", content: `Customer Reviews — ${BRANDING.name}` },
      { property: "og:description", content: "What our clients say about their experience. Authentic, verified feedback." },
    ],
  }),
  component: ReviewsPage,
});



function ReviewsPage() {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");

  const reviewsQuery = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const reviewsList = reviewsQuery.data ?? [];

  const filteredReviews = reviewsList.filter((r) => {
    const matchesSearch =
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.service_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.comment && r.comment.toLowerCase().includes(search.toLowerCase()));
    
    const matchesRating = ratingFilter === "all" || r.rating === ratingFilter;
    
    return matchesSearch && matchesRating;
  });

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Exact Editorial Reviews Page Layout
          ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-zinc-950 text-black dark:text-white pt-16 pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
            [ PUBLIC FEEDBACK ]
          </span>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-tighter uppercase leading-[0.85] select-none text-black dark:text-white">
              REVIEWS.
            </h1>
            <p className="max-w-sm text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-light leading-relaxed pb-3">
              Read authentic feedback logged directly from our shops. Every service rating is verified.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BLACK MARQUEE STRIP ACROSS FULL WIDTH
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-t border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap justify-around sm:justify-between px-6 max-w-7xl mx-auto">
          <span>CLIENT FEEDBACK</span>
          <span className="text-zinc-650 dark:text-zinc-400">•</span>
          <span>VERIFIED RATING 4.9★</span>
          <span className="text-zinc-650 dark:text-zinc-400">•</span>
          <span>PRECISION SERVICES</span>
          <span className="text-zinc-650 dark:text-zinc-400">•</span>
          <span>HONEST REVIEWS</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          REVIEWS BROWSER SECTION
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-white dark:bg-zinc-950 text-black dark:text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-10 space-y-12">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-2 border-black dark:border-white p-4 rounded-3xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search reviews, services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 border-zinc-250 dark:border-zinc-800 focus-visible:ring-black dark:focus-visible:ring-white rounded-full bg-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setRatingFilter("all")}
                className={cn(
                  "px-4 py-2 rounded-full font-mono text-xs uppercase tracking-widest border transition-all",
                  ratingFilter === "all"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white font-bold"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white"
                )}
              >
                All ratings
              </button>
              {[5, 4, 3, 2, 1].map((num) => (
                <button
                  key={num}
                  onClick={() => setRatingFilter(num)}
                  className={cn(
                    "px-4 py-2 rounded-full font-mono text-xs uppercase tracking-widest border flex items-center gap-1 transition-all",
                    ratingFilter === num
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white font-bold"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white"
                  )}
                >
                  {num}★
                </button>
              ))}
            </div>
          </div>

          {/* Grid Layout of Cards */}
          {filteredReviews.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
              <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
                [ No reviews match your criteria ]
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredReviews.map((r: any) => (
                <div
                  key={r.id}
                  className="flex flex-col justify-between p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 hover:scale-[1.01] hover:border-black dark:hover:border-white hover:shadow-xl transition-all duration-350 ease-out min-h-[260px] shadow-sm cursor-default"
                >
                  <div className="space-y-4">
                    {/* Stars */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < Number(r.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-200 dark:text-zinc-800"
                          )}
                        />
                      ))}
                    </div>

                    {r.comment && (
                      <p className="font-serif italic text-lg leading-relaxed text-zinc-800 dark:text-zinc-200">
                        "{r.comment}"
                      </p>
                    )}
                  </div>

                  <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex justify-between items-center text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="font-bold text-black dark:text-white uppercase">
                        [ {r.customer_name} ]
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        {new Date(r.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="text-zinc-450 dark:text-zinc-500 uppercase font-black text-[10px] tracking-wider border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-md max-w-[50%] truncate text-right">
                      {r.service_name} {r.barber_name ? `with ${r.barber_name}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BOTTOM CTA BLOCK
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-zinc-950 text-white border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="rounded-3xl bg-white text-black dark:bg-zinc-900 dark:text-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500">
                [ READY TO BOOK? ]
              </span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                EXPERIENCE THE {BRANDING.shortName.toUpperCase()} STANDARD.
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
                Fast online scheduling. Select your specialist, confirm your slot, and secure your time instantly.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.2em] uppercase px-8 h-14 hover:scale-105 transition-transform"
            >
              <Link to="/book">
                BOOK APPOINTMENT <ArrowUpRight className="ml-2 h-4 w-4 stroke-[2.5]" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
