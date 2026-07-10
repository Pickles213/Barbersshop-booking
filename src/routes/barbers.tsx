import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Star, Image as ImageIcon, Award, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDuration } from "@/lib/format-duration";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchBarbers, fetchBarberPortfolio, fetchServices, type Barber } from "@/lib/customer-api";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    setShowAllReviews(false);
    setActiveTab("profile");
  }, [barber?.id]);

  useEffect(() => {
    const container = document.getElementById("barber-scroll-container");
    if (!container) return;

    const handleScroll = () => {
      const sections = ["profile", "services", "portfolio", "reviews"];
      let activeSection = "profile";
      let minDistance = Infinity;
      
      for (const section of sections) {
        const el = document.getElementById(`section-${section}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const distance = Math.abs(rect.top - containerRect.top - 12);
          if (distance < minDistance) {
            minDistance = distance;
            activeSection = section;
          }
        }
      }
      setActiveTab(activeSection);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [barber?.id]);

  const handleTabClick = (section: string) => {
    setActiveTab(section);
    const container = document.getElementById("barber-scroll-container");
    const target = document.getElementById(`section-${section}`);
    if (container && target) {
      container.scrollTo({
        top: target.offsetTop - container.offsetTop - 12,
        behavior: "smooth"
      });
    }
  };

  const portfolio = useQuery({
    queryKey: ["portfolio", barber?.id],
    queryFn: () => fetchBarberPortfolio(barber!.id),
    enabled: !!barber,
  });

  const reviews = useQuery({
    queryKey: ["reviews", barber?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_barber_reviews", { p_barber_id: barber!.id });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barber,
  });

  const stats = useQuery({
    queryKey: ["barber-stats", barber?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_barber_stats", { p_barber_id: barber!.id });
      if (error) throw error;
      return data?.[0] ?? { appointments_completed: 0, clients_served: 0 };
    },
    enabled: !!barber,
  });

  const services = useQuery({
    queryKey: ["barber-services", barber?.id],
    queryFn: async () => {
      try {
        const { data: bcData, error: bcError } = await supabase
          .from("barber_categories")
          .select("category")
          .eq("barber_id", barber!.id);
        if (bcError) throw bcError;
        const barberCats = (bcData || []).map((d: any) => d.category);

        const { data: sData, error: sError } = await supabase
          .from("services")
          .select("*")
          .eq("is_active", true);
        if (sError) throw sError;

        return (sData || []).filter((s: any) => barberCats.includes(s.category));
      } catch (e) {
        console.error("[Supabase] Error fetching barber services:", e);
        return [];
      }
    },
    enabled: !!barber,
  });

  if (!barber) return null;

  const completed = stats.data?.appointments_completed || 0;
  const clients = stats.data?.clients_served || 0;


  return (
    <Dialog open={!!barber} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-zinc-950 text-black dark:text-white p-0 border-2 border-black dark:border-zinc-800 rounded-3xl overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{barber.name} Profile</DialogTitle>
          <DialogDescription>Barber profile details, services, portfolio cuts and client reviews.</DialogDescription>
        </DialogHeader>

        {/* Top Barber Profile Header */}
        <div className="flex flex-col items-center text-center p-4 pb-2 space-y-1.5 bg-zinc-50/50 dark:bg-zinc-900/10 shrink-0">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-black dark:border-white shadow-md bg-zinc-200">
            <img 
              src={barber.avatar_url || PORTFOLIO_FALLBACKS[0]} 
              alt={barber.name} 
              className="h-full w-full object-cover" 
            />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">{barber.name}</h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mt-0.5">
              {barber.specialization || "BARBER / STYLE ARTIST"}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full font-bold">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{barber.rating ? Number(barber.rating).toFixed(1) : "5.0"}</span>
            <span className="text-zinc-500 font-medium text-[10px]">({reviews.data?.length || 0})</span>
          </div>
        </div>

        {/* Scroll Sync Navigation */}
        <div className="px-6 pb-4 flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-4 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-full h-11 border border-zinc-200/50 dark:border-zinc-800/35 mb-4 shrink-0">
            <button 
              onClick={() => handleTabClick("profile")}
              className={cn(
                "rounded-full text-xs font-bold px-2 py-1.5 transition-all cursor-pointer animate-none",
                activeTab === "profile" 
                  ? "bg-black text-white dark:bg-white dark:text-black font-extrabold" 
                  : "text-zinc-500 hover:text-black dark:hover:text-white"
              )}
            >
              Profile
            </button>
            <button 
              onClick={() => handleTabClick("services")}
              className={cn(
                "rounded-full text-xs font-bold px-2 py-1.5 transition-all cursor-pointer animate-none",
                activeTab === "services" 
                  ? "bg-black text-white dark:bg-white dark:text-black font-extrabold" 
                  : "text-zinc-500 hover:text-black dark:hover:text-white"
              )}
            >
              Services
            </button>
            <button 
              onClick={() => handleTabClick("portfolio")}
              className={cn(
                "rounded-full text-xs font-bold px-2 py-1.5 transition-all flex gap-1 items-center justify-center cursor-pointer animate-none",
                activeTab === "portfolio" 
                  ? "bg-black text-white dark:bg-white dark:text-black font-extrabold" 
                  : "text-zinc-500 hover:text-black dark:hover:text-white"
              )}
            >
              Portfolio
              <span className="text-[9px] px-1 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-555 font-mono font-bold shrink-0">
                {portfolio.data?.length || 0}
              </span>
            </button>
            <button 
              onClick={() => handleTabClick("reviews")}
              className={cn(
                "rounded-full text-xs font-bold px-2 py-1.5 transition-all flex gap-1 items-center justify-center cursor-pointer animate-none",
                activeTab === "reviews" 
                  ? "bg-black text-white dark:bg-white dark:text-black font-extrabold" 
                  : "text-zinc-500 hover:text-black dark:hover:text-white"
              )}
            >
              Reviews
              <span className="text-[9px] px-1 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-555 font-mono font-bold shrink-0">
                {reviews.data?.length || 0}
              </span>
            </button>
          </div>

          {/* Continuous Scroll Viewport */}
          <div 
            id="barber-scroll-container"
            className="flex-1 overflow-y-auto pr-1 space-y-8 scroll-smooth"
          >
            {/* Section 1: Profile */}
            <div id="section-profile" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block animate-none">Appointments completed</span>
                  <span className="text-xl font-mono font-bold block mt-1">{completed}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block animate-none">Clients served</span>
                  <span className="text-xl font-mono font-bold block mt-1">{clients}</span>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block font-bold">[ ABOUT ]</span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                  {barber.bio || `${barber.name} is a dedicated master cut craftsman bringing precision and classic style to every single client.`}
                </p>
              </div>
            </div>

            {/* Section 2: Services */}
            <div id="section-services" className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900 text-left">
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block font-bold">[ SERVICES OFFERED ]</span>
              <div className="space-y-2.5">
                {services.isLoading ? (
                  <div className="text-center py-10 text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
                    [ Loading Services... ]
                  </div>
                ) : (services.data || []).length === 0 ? (
                  <div className="text-center py-10 text-xs font-mono text-zinc-500 uppercase tracking-widest border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    [ No services found ]
                  </div>
                ) : (
                  (services.data || []).map((s: any) => (
                    <div 
                      key={s.id} 
                      className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/10 hover:border-black dark:hover:border-white transition-all"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs uppercase tracking-tight text-black dark:text-white truncate">{s.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{formatDuration(s.duration_minutes)}</p>
                        <p className="text-xs font-black mt-1">₱{Number(s.price).toLocaleString()}</p>
                      </div>
                      <Button 
                        asChild 
                        size="sm" 
                        className="rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-[10px] uppercase px-4 h-8 shrink-0 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Link to="/book" search={{ barber: barber.id, service: s.id } as any}>Book</Link>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 3: Portfolio */}
            <div id="section-portfolio" className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900 text-left">
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block font-bold">[ PORTFOLIO CUTS ]</span>
              {portfolio.isLoading ? (
                <div className="text-center py-12 text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
                  [ Loading Portfolio Cuts... ]
                </div>
              ) : (portfolio.data || []).length === 0 ? (
                <div className="text-center py-12 text-xs font-mono text-zinc-500 uppercase tracking-widest border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                  <p className="text-zinc-550 block">[ No portfolio work ]</p>
                  <p className="text-[10px] text-zinc-400 mt-1 uppercase font-normal">Check back soon for styling cuts!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(portfolio.data || []).map((img: any, i: number) => (
                    <div 
                      key={img.id || i} 
                      className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                    >
                      <img 
                        src={img.image_url} 
                        alt={img.caption || `Cut ${i + 1}`} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                      {img.caption && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-[10px] text-white font-mono font-bold leading-tight">
                          [{img.caption}]
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Reviews */}
            <div id="section-reviews" className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900 pb-2 text-left">
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block font-bold">[ CLIENT REVIEWS ]</span>
              {reviews.isLoading ? (
                <div className="text-center py-12 text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
                  [ Loading Reviews... ]
                </div>
              ) : (reviews.data || []).length === 0 ? (
                <div className="text-center py-12 text-xs font-mono text-zinc-500 uppercase tracking-widest border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                  <p className="text-zinc-550 block">[ No reviews yet ]</p>
                  <p className="text-[10px] text-zinc-400 mt-1 uppercase font-normal">Be the first to review after your booking!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(showAllReviews ? (reviews.data || []) : (reviews.data || []).slice(0, 10)).map((r: any) => (
                    <div 
                      key={r.id} 
                      className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-2 bg-zinc-50/30 dark:bg-zinc-900/5 text-xs text-left"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold uppercase tracking-tight text-black dark:text-white">{r.customer_name}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">
                          {new Date(r.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={cn(
                              "h-3.5 w-3.5 shrink-0", 
                              i < r.rating 
                                ? "fill-amber-400 text-amber-400" 
                                : "text-zinc-200 dark:text-zinc-850"
                            )} 
                          />
                        ))}
                      </div>
                      {r.comment && (
                        <p className="text-zinc-650 dark:text-zinc-400 italic font-light leading-relaxed">
                          "{r.comment}"
                        </p>
                      )}
                      {r.service_name && (
                        <span className="inline-block text-[9px] text-zinc-400 font-mono uppercase tracking-wide">
                          [ Service: {r.service_name} ]
                        </span>
                      )}
                    </div>
                  ))}
                  {reviews.data && reviews.data.length > 10 && !showAllReviews && (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllReviews(true)}
                      className="w-full mt-2 rounded-2xl border-zinc-300 dark:border-zinc-700 font-mono text-[10px] font-bold tracking-widest uppercase h-10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                    >
                      [ See all {reviews.data.length} reviews ]
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky dialog footer with Book now button */}
        <div className="p-4 border-t border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950">
          <Button 
            asChild 
            className="w-full rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs uppercase tracking-widest h-11 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Link to="/book" search={{ barber: barber.id } as any}>Book now</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}