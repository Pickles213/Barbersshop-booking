import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { fetchCharities, fetchShopSettings, type CharityEntry } from "@/lib/customer-api";
import { BRANDING } from "@/config/branding";

export const Route = createFileRoute("/about")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `About Us — ${BRANDING.name}` },
      { name: "description", content: `Learn about ${BRANDING.name} — our story, mission, and the charities we've proudly supported.` },
      { property: "og:title", content: `About Us — ${BRANDING.name}` },
      { property: "og:description", content: `Learn about ${BRANDING.name} — our story, mission, and the charities we've proudly supported.` },
    ],
  }),
  component: AboutPage,
});

/* ──────────────────────────────────────────────────────────────────────────────
   Video Embed Helper
   ────────────────────────────────────────────────────────────────────────────── */

function getEmbedUrl(url: string): string | null {
  try {
    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  } catch {
    /* invalid url, fall through */
  }
  return null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function VideoEmbed({ url }: { url: string }) {
  const embedUrl = getEmbedUrl(url);

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title="Charity video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    );
  }

  if (isDirectVideo(url)) {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  // Fallback: try as iframe
  return (
    <iframe
      src={url}
      title="Charity video"
      allowFullScreen
      className="absolute inset-0 h-full w-full"
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Charity Card
   ────────────────────────────────────────────────────────────────────────────── */

function CharityCard({ entry, index }: { entry: CharityEntry; index: number }) {
  const num = (index + 1).toString().padStart(2, "0");
  const dateStr = entry.event_date
    ? new Date(entry.event_date + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const isEven = index % 2 === 0;

  return (
    <div className="group grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-10 transition-all duration-300 hover:border-zinc-400 dark:hover:border-zinc-600">
      {/* Content Area */}
      <div 
        className={`${
          entry.video_url ? "lg:col-span-7" : "lg:col-span-12"
        } flex flex-col justify-center space-y-6 ${
          entry.video_url && !isEven ? "lg:order-last" : "lg:order-first"
        }`}
      >
        <div className="space-y-4">
          {/* Location Badge */}
          {entry.location && (
            <div className="inline-block bg-black text-white dark:bg-white dark:text-black font-mono text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1">
              {entry.location}
            </div>
          )}

          {/* Number + Title */}
          <div className="space-y-2">
            <span className="block font-mono text-xs font-bold tracking-[0.15em] text-zinc-400 dark:text-zinc-600">
              [{num}]
            </span>
            <h3 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-black dark:text-white leading-[1.05]">
              {entry.title}
            </h3>
          </div>

          {/* Date */}
          {dateStr && (
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              {dateStr}
            </div>
          )}

          {/* Description */}
          {entry.description && (
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
              {entry.description}
            </p>
          )}
        </div>
      </div>

      {/* Video Area */}
      {entry.video_url && (
        <div 
          className={`lg:col-span-5 flex items-center justify-center ${
            !isEven ? "lg:order-first" : "lg:order-last"
          }`}
        >
          <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <VideoEmbed url={entry.video_url} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   About Page
   ────────────────────────────────────────────────────────────────────────────── */

function AboutPage() {
  const { data: charities, isLoading } = useQuery({
    queryKey: ["charities"],
    queryFn: fetchCharities,
  });

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: fetchShopSettings,
  });

  const heroTitle = shop?.about_hero_title || "OUR STORY";
  const heroSubtitle = shop?.about_hero_subtitle || "More than just haircuts — we're a community-driven barbershop rooted in craft, culture, and giving back.";
  const headingText = shop?.about_heading || "BUILT ON THE SOUTHSIDE";
  const estYear = shop?.about_year || "2024";
  
  const aboutBody = shop?.about_body;
  const paragraphs = aboutBody
    ? aboutBody
        .split("\n")
        .map((p: string) => p.trim())
        .filter((p: string) => p !== "")
    : [
        `${BRANDING.name} started with a single chair and a simple belief: every person deserves a clean cut and a genuine conversation. What began as a small neighborhood shop has grown into a trusted name across multiple branches — but the ethos remains the same.`,
        "Our barbers are more than stylists — they're craftsmen who take pride in precision fades, classic shaves, and making every client feel like they belong. We invest in our team's growth, source quality products, and keep our prices fair.",
        "Beyond the chair, we believe in lifting up the communities that support us. From charity drives to local sponsorships, giving back is woven into everything we do."
      ];

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Editorial Brutalist Typography
          ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-zinc-950 text-black dark:text-white pt-16 pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
            [ ABOUT US ]
          </span>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black tracking-tighter uppercase leading-[0.85] select-none text-black dark:text-white break-words">
              {heroTitle}
            </h1>
            <p className="max-w-md text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-light leading-relaxed pb-3">
              {heroSubtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BLACK MARQUEE STRIP ACROSS FULL WIDTH
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-t border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap justify-around sm:justify-between px-6 max-w-7xl mx-auto">
          <span>COMMUNITY</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>CRAFT</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>CHARITY</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>{BRANDING.shortName.toUpperCase()}</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>CULTURE</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ABOUT THE BUSINESS
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-zinc-950 text-black dark:text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Section Label */}
          <div className="flex items-center gap-4 py-3 border-b border-zinc-200 dark:border-zinc-800 mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
              01 — OUR STORY
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left: About Text */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] text-black dark:text-white">
                {headingText}
              </h2>
              <div className="space-y-4 text-sm md:text-base text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                {paragraphs.map((p: string, index: number) => (
                  <p key={index}>{p}</p>
                ))}
              </div>
            </div>

            {/* Right: Decorative Element */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="relative w-full max-w-sm aspect-square border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="text-8xl font-black tracking-tighter text-zinc-100 dark:text-zinc-900 select-none leading-none">
                    EST.
                  </div>
                  <div className="text-6xl font-black tracking-tighter text-black dark:text-white select-none leading-none">
                    {estYear}
                  </div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 pt-2">
                    [ {BRANDING.name.toUpperCase()} ]
                  </div>
                </div>
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-black dark:border-white" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-black dark:border-white" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-black dark:border-white" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-black dark:border-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          CHARITIES WE'VE SUPPORTED
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/30 text-black dark:text-white border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Section Label */}
          <div className="flex items-center gap-4 py-3 border-b border-zinc-200 dark:border-zinc-800 mb-8">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
              02 — CHARITIES WE'VE SUPPORTED
            </span>
          </div>

          <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] text-black dark:text-white">
                GIVING BACK
              </h2>
              <p className="max-w-lg text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
                We believe in using our platform to make a difference. Here
                are some of the causes and communities we've been proud to
                support.
              </p>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
              <Heart className="h-5 w-5" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
                {(charities ?? []).length} {(charities ?? []).length === 1 ? "CAUSE" : "CAUSES"} SUPPORTED
              </span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                  <div className="aspect-video bg-zinc-200 dark:bg-zinc-800" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-900 rounded" />
                    <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && (charities ?? []).length === 0 && (
            <div className="text-center py-24 border border-dashed border-zinc-300 dark:border-zinc-800 p-12">
              <Heart className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
                [ CHARITY ENTRIES COMING SOON ]
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                Check back soon — we'll be sharing our community involvement
                here.
              </p>
            </div>
          )}

          {/* Charity Cards Stack (Landscape) */}
          {!isLoading && (charities ?? []).length > 0 && (
            <div className="space-y-8">
              {charities!.map((entry, i) => (
                <CharityCard key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
