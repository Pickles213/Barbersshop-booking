import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight">Southside Barbers</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Classic cuts and modern style. Booked in seconds.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/services" className="hover:text-foreground">Services</Link></li>
            <li><Link to="/barbers" className="hover:text-foreground">Barbers</Link></li>
            <li><Link to="/book" className="hover:text-foreground">Book an appointment</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">For staff</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Staff sign in</Link></li>
            <li><Link to="/admin/dashboard" className="hover:text-foreground">Admin dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Southside Barbers. All rights reserved.
      </div>
    </footer>
  );
}