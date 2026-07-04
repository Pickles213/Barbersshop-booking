import { Link } from "@tanstack/react-router";
import { Scissors, ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-4 justify-between">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center bg-white text-black font-extrabold">
                <Scissors className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tracking-tighter uppercase leading-none text-white">
                  Southside
                </span>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400 uppercase mt-0.5">
                  Barbershop Network
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
            </ul>
          </div>

          {/* Staff Col */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 mb-5">
              [ FOR STAFF ]
            </h3>
            <ul className="space-y-3 text-xs font-bold tracking-[0.15em] text-zinc-300 uppercase">
              <li>
                <Link to="/auth" className="hover:text-white transition-colors">
                  Staff Sign In ↗
                </Link>
              </li>
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
            © {new Date().getFullYear()} SOUTHSIDE BARBERSHOP. ALL RIGHTS RESERVED.
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