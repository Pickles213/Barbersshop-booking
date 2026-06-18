import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchServices, type Service } from "@/lib/customer-api";

export const Route = createFileRoute("/services")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Services & Pricing — Sharp & Co." },
      { name: "description", content: "Browse haircuts, beard trims, hot-towel shaves and styling packages with transparent pricing." },
      { property: "og:title", content: "Services & Pricing — Sharp & Co." },
      { property: "og:description", content: "Browse haircuts, beard trims, hot-towel shaves and styling packages with transparent pricing." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["services"], queryFn: fetchServices });

  const byCategory = (data ?? []).reduce<Record<string, Service[]>>((acc, s) => {
    const key = s.category ?? "Other";
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="text-4xl font-bold tracking-tight">Services</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Transparent pricing. Skilled barbers. Pick a service and book online — no phone tag required.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        {isLoading && <p className="text-sm text-muted-foreground">Loading services…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No services available yet — check back soon.</p>
        )}
        <div className="space-y-10">
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="mb-4 text-xl font-semibold tracking-tight">{cat}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <Card key={s.id} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">{s.name}</h3>
                        <Badge variant="secondary">₱{Number(s.price).toFixed(0)}</Badge>
                      </div>
                      {s.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                      )}
                      <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} minutes
                      </div>
                      <div className="mt-5 pt-2">
                        <Button asChild className="w-full">
                          <Link to="/book" search={{ service: s.id } as never}>Book this</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}