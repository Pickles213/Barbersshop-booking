import { Link, useNavigate } from "@tanstack/react-router";
import { Scissors, Menu, LogOut, CalendarCheck, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "HOME" },
  { to: "/services", label: "SERVICES" },
  { to: "/barbers", label: "BARBERS" },
  { to: "/queue", label: "LIVE QUEUE" },
  { to: "/contact", label: "CONTACT" },
] as const;

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-background/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-10">
        {/* Left · Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 transition-transform duration-300 group-hover:scale-105 shrink-0">
            <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover animate-none" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tighter uppercase leading-none">
              Southside
            </span>
            <span className="text-[10px] font-semibold tracking-[0.25em] text-zinc-500 uppercase mt-0.5">
              Barbershop
            </span>
          </div>
        </Link>

        {/* Center · Bracketed Navigation */}
        <nav className="hidden items-center gap-5 xl:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "whitespace-nowrap text-xs font-bold tracking-[0.18em] text-zinc-500 transition-all duration-200",
                "hover:text-black dark:hover:text-white hover:scale-105"
              )}
              activeProps={{
                className: "text-black dark:text-white font-extrabold underline decoration-2 underline-offset-8",
              }}
              activeOptions={{ exact: n.to === "/" }}
            >
              [ {n.label} ]
            </Link>
          ))}
        </nav>

        {/* Right · Actions & Auth */}
        <div className="hidden items-center gap-4 xl:flex">
          {email ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="font-mono text-xs font-semibold tracking-wider">
                  [ {email.split("@")[0].toUpperCase()} ]
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-sans">
                <DropdownMenuLabel className="truncate text-xs font-mono">{email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/my-bookings" className="cursor-pointer font-medium">
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    My bookings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive font-medium">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              className="text-xs font-bold tracking-[0.15em] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors uppercase px-2 py-1"
            >
              [ SIGN IN ]
            </Link>
          )}

          <Button
            asChild
            size="lg"
            className={cn(
              "rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.15em] uppercase px-6 h-11",
              "hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-md"
            )}
          >
            {email ? (
              <Link to="/book" className="flex items-center gap-1.5">
                BOOK NOW <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
              </Link>
            ) : (
              <Link to="/auth" search={{ redirect: "/book" }} className="flex items-center gap-1.5">
                BOOK NOW <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
              </Link>
            )}
          </Button>
        </div>

        {/* Mobile Menu Drawer */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="xl:hidden rounded-none border-zinc-300 dark:border-zinc-700">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-background p-6">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <SheetDescription className="sr-only">Site navigation links and account actions</SheetDescription>
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex flex-col gap-1 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 mb-2">Navigation</span>
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    className="py-2.5 text-base font-extrabold tracking-widest uppercase hover:text-primary transition-colors"
                    activeProps={{ className: "text-primary underline decoration-2 underline-offset-4" }}
                  >
                    [ {n.label} ]
                  </Link>
                ))}
                {email && (
                  <Link
                    to="/my-bookings"
                    className="py-2.5 text-base font-extrabold tracking-widest uppercase hover:text-primary transition-colors"
                  >
                    [ MY BOOKINGS ]
                  </Link>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs tracking-[0.15em] uppercase w-full h-12"
                >
                  {email ? (
                    <Link to="/book" className="flex items-center justify-center gap-2">
                      BOOK NOW <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                    </Link>
                  ) : (
                    <Link to="/auth" search={{ redirect: "/book" }} className="flex items-center justify-center gap-2">
                      BOOK NOW <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                    </Link>
                  )}
                </Button>

                {email ? (
                  <Button variant="outline" onClick={signOut} className="rounded-full font-bold text-xs tracking-wider uppercase h-11">
                    Sign out
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="rounded-full font-bold text-xs tracking-wider uppercase h-11">
                    <Link to="/auth">Sign in</Link>
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}