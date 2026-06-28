import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Scissors, Star, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchBarbers, fetchBarberPortfolio, type Barber } from "@/lib/customer-api";

export const Route = createFileRoute("/barbers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Our Barbers — Southside Barbers" },
      { name: "description", content: "Meet our master barbers. Browse specialties, experience and portfolio work." },
      { property: "og:title", content: "Our Barbers — Southside Barbers" },
      { property: "og:description", content: "Meet our master barbers. Browse specialties, experience and portfolio work." },
    ],
  }),
  component: BarbersPage,
});

function BarbersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["barbers"], queryFn: fetchBarbers });
  const [openBarber, setOpenBarber] = useState<Barber | null>(null);

  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="text-4xl font-bold tracking-tight">Our barbers</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Each barber brings their own style. Tap any portfolio to see their work.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        {isLoading && <p className="text-sm text-muted-foreground">Loading barbers…</p>}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-muted">
                {b.avatar_url ? (
                  <img src={b.avatar_url} alt={b.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground">
                    <Scissors className="h-12 w-12" />
                  </div>
                )}
              </div>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{b.name}</h3>
                  {b.rating != null && (
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {Number(b.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {b.specialization && <Badge variant="secondary">{b.specialization}</Badge>}
                  {b.experience_years != null && (
                    <Badge variant="outline">{b.experience_years} yrs experience</Badge>
                  )}
                </div>
                {b.bio && <p className="mt-3 text-sm text-muted-foreground">{b.bio}</p>}
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenBarber(b)}>
                    <ImageIcon className="mr-1.5 h-4 w-4" /> Portfolio
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/book" search={{ barber: b.id } as never}>Book {b.name.split(" ")[0]}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <PortfolioDialog barber={openBarber} onClose={() => setOpenBarber(null)} />
    </SiteLayout>
  );
}

function PortfolioDialog({ barber, onClose }: { barber: Barber | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["portfolio", barber?.id],
    queryFn: () => fetchBarberPortfolio(barber!.id),
    enabled: !!barber,
  });
  return (
    <Dialog open={!!barber} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{barber?.name}'s portfolio</DialogTitle>
        </DialogHeader>
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">No portfolio images yet.</p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {(data ?? []).map((img) => (
            <div key={img.id} className="overflow-hidden rounded-md border">
              <img src={img.image_url} alt={img.caption ?? ""} className="aspect-square w-full object-cover" />
              {img.caption && <p className="px-2 py-1 text-xs text-muted-foreground">{img.caption}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}