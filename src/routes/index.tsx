import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sharp & Co. — Barber Shop Admin" },
      { name: "description", content: "Admin console for managing bookings, barbers and services." },
      { property: "og:title", content: "Sharp & Co. — Barber Shop Admin" },
      { property: "og:description", content: "Admin console for managing bookings, barbers and services." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Scissors className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Sharp &amp; Co.</h1>
        <p className="mt-3 text-muted-foreground">
          Barber shop booking system — admin dashboard module.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/admin/dashboard">
              Open Admin Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
