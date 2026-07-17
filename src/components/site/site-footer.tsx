import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Scissors, ArrowUpRight, Facebook, Instagram, Twitter, Music2 } from "lucide-react";
import { BRANDING } from "@/config/branding";

import { fetchShopSettings } from "@/lib/customer-api";

const SOCIAL_LINKS = [
  { key: "facebook_url" as const, label: "Facebook", Icon: Facebook },
  { key: "instagram_url" as const, label: "Instagram", Icon: Instagram },
  { key: "tiktok_url" as const, label: "TikTok", Icon: Music2 },
  { key: "x_url" as const, label: "X", Icon: Twitter },
];

export function SiteFooter() {
  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: fetchShopSettings });
  const activeSocials = SOCIAL_LINKS.filter(({ key }) => shop?.[key]);

  return (
    <footer className="mt-16 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-4 justify-between">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden border border-zinc-800 rounded-lg shrink-0">
                <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-extrabold tracking-tighter uppercase leading-none text-white">
                  {BRANDING.shortName}
                </span>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400 uppercase mt-0.5">
                  {BRANDING.tagline} Network
                </span>
              </div>
            </div>
            <p className="max-w-sm text-sm text-zinc-400 font-light leading-relaxed">
              We understand the pace of the city and the needs of its residents. Precision, experience, and results that speak for themselves.
            </p>
            <div className="pt-2">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white hover:text-zinc-300 underline decoration-1 underline-offset-8 transition-colors"
              >
                BOOK YOUR HAIRCUT TODAY <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
              </Link>
            </div>
            {activeSocials.length > 0 && (
              <div className="flex gap-3 pt-2">
                {activeSocials.map(({ key, label, Icon }) => (
                  <a
                    key={key}
                    href={shop![key]!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={`grid h-9 w-9 place-items-center rounded-lg border transition-all ${
                      key === "facebook_url"
                        ? "bg-[#1877F2] text-white border-transparent hover:scale-110"
                        : key === "instagram_url"
                        ? "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white border-transparent hover:scale-110"
                        : key === "tiktok_url"
                        ? "bg-black text-white border-[#00f2fe]/80 shadow-[1.5px_1.5px_0px_#fe0979,-1.5px_-1.5px_0px_#00f2fe] hover:scale-110"
                        : "bg-black text-white border-zinc-800 hover:scale-110 hover:bg-zinc-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Col */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 mb-5">
              [ EXPLORE ]
            </h3>
            <ul className="space-y-3 text-xs font-bold tracking-[0.15em] text-zinc-300 uppercase">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  [ 01 ] Home
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  [ 02 ] Services & Price
                </Link>
              </li>
              <li>
                <Link to="/barbers" className="hover:text-white transition-colors">
                  [ 03 ] Master Barbers
                </Link>
              </li>
              <li>
                <Link to="/queue" className="hover:text-white transition-colors">
                  [ 04 ] Live Queue
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  [ 05 ] Contact & Location
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  [ 06 ] About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Staff Col */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 mb-5">
              [ FOR STAFF ]
            </h3>
            <ul className="space-y-3 text-xs font-bold tracking-[0.15em] text-zinc-300 uppercase">
              <li>
                <Link to="/admin/dashboard" className="hover:text-white transition-colors">
                  Admin Dashboard ↗
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 border-t border-zinc-800/80 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div>
            © {new Date().getFullYear()} {BRANDING.fullName.toUpperCase()}. ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-6 uppercase tracking-wider">
            <span className="hover:text-zinc-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-zinc-400 cursor-pointer">Terms of Use</span>
            <span className="hover:text-zinc-400 cursor-pointer">Cookies Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}