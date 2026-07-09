import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ComponentType } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { fetchShopSettings } from "@/lib/customer-api";
import { formatTime, cn, formatPhoneNumber } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Visit & Contact — Southside Barbers" },
      { name: "description", content: "Shop hours, address, and phone number at Southside Barbers." },
      { property: "og:title", content: "Visit & Contact — Southside Barbers" },
      { property: "og:description", content: "Shop hours, address, and phone number." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data, isLoading } = useQuery({ queryKey: ["shop"], queryFn: fetchShopSettings });
  const mapUrl = data?.shop_address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(data.shop_address)}&z=15&ie=UTF8&iwloc=B&output=embed`
    : null;

  const hoursString =
    data?.open_time && data?.close_time
      ? `${formatTime(data.open_time.slice(0, 5))} – ${formatTime(data.close_time.slice(0, 5))} DAILY`
      : "10:00 AM – 08:00 PM DAILY";

  return (
    <SiteLayout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — Editorial Brutalist Typography
          ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-zinc-950 text-black dark:text-white pt-16 pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-zinc-500">
            [ SHOP LOCATION & INFO ]
          </span>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-tighter uppercase leading-[0.85] select-none text-black dark:text-white">
              VISIT US
            </h1>
            <p className="max-w-md text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-light leading-relaxed pb-3">
              Walk in for a traditional razor shave or book ahead online to secure your preferred master barber. We will have a fresh chair and a hot towel ready when you step in.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BLACK MARQUEE STRIP ACROSS FULL WIDTH
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-black text-white dark:bg-white dark:text-black py-4 overflow-hidden select-none border-t border-b border-zinc-800 dark:border-zinc-200 font-mono text-xs font-black uppercase tracking-[0.3em]">
        <div className="flex whitespace-nowrap justify-around sm:justify-between px-6 max-w-7xl mx-auto">
          <span>OPEN DAILY</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>SOUTHSIDE BARBERS</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>WALK-INS WELCOME</span>
          <span className="text-zinc-600 dark:text-zinc-400">•</span>
          <span>HOT TOWEL SHAVES</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          CONTACT & MAP SHOWCASE — High Contrast 2-Column Layout
          ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-zinc-950 text-black dark:text-white min-h-[600px]">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* LEFT COLUMN: Numbered Shop Details */}
            <div className="lg:col-span-5 space-y-10">
              <div className="border-b-2 border-black dark:border-white pb-4">
                <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
                  [ SHOP DIRECTORY ]
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-8 animate-pulse">
                  <div className="h-16 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                  <div className="h-16 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                  <div className="h-16 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                </div>
              ) : (
                <div className="space-y-8 divide-y divide-zinc-200 dark:divide-zinc-800">
                  
                  {/* Address */}
                  <div className="pt-6 first:pt-0 flex items-start gap-6">
                    <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                      [01]
                    </span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-wider">
                        <MapPin className="h-3.5 w-3.5 text-black dark:text-white" /> ADDRESS
                      </div>
                      <p className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-black dark:text-white leading-snug">
                        {data?.shop_address || "123 Southside Ave, District 4, Manila"}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="pt-6 flex items-start gap-6">
                    <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                      [02]
                    </span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-wider">
                        <Phone className="h-3.5 w-3.5 text-black dark:text-white" /> PHONE
                      </div>
                      <p className="text-lg sm:text-xl font-extrabold font-mono tracking-tight text-black dark:text-white">
                        {formatPhoneNumber(data?.shop_phone) || "0967 676 7676"}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  {data?.shop_email && (
                    <div className="pt-6 flex items-start gap-6">
                      <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                        [03]
                      </span>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-wider">
                          <Mail className="h-3.5 w-3.5 text-black dark:text-white" /> EMAIL
                        </div>
                        <p className="text-base sm:text-lg font-bold font-mono text-black dark:text-white">
                          {data.shop_email}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hours */}
                  <div className="pt-6 flex items-start gap-6">
                    <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                      [04]
                    </span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-wider">
                        <Clock className="h-3.5 w-3.5 text-black dark:text-white" /> OPERATING HOURS
                      </div>
                      <p className="text-lg sm:text-xl font-extrabold uppercase font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                        {hoursString}
                      </p>
                    </div>
                  </div>


                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Interactive Map Embed */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border-2 border-black dark:border-white overflow-hidden shadow-2xl bg-zinc-900 aspect-square sm:aspect-[16/11] relative group">
                {mapUrl ? (
                  <iframe
                    src={mapUrl}
                    className="h-full w-full filter grayscale contrast-125 transition-all duration-500 group-hover:filter-none"
                    loading="lazy"
                    title="Southside Barbers Map Location"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-center p-12 bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                    <div className="space-y-3">
                      <MapPin className="h-12 w-12 mx-auto text-black dark:text-white animate-bounce" />
                      <p className="font-mono text-xs uppercase tracking-widest">
                        [ MAP LOCATION EMBED ]
                      </p>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
                        SOUTHSIDE BARBERS
                      </h3>
                      <p className="text-xs max-w-sm mx-auto">
                        123 Southside Ave, District 4, Manila. Easily accessible via public transit with street parking out front.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </SiteLayout>
  );
}