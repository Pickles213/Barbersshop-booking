import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Mail, MapPin, Phone, CreditCard, Wallet } from "lucide-react";
import type { ComponentType } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchShopSettings } from "@/lib/customer-api";

export const Route = createFileRoute("/contact")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Visit & Contact — Sharp & Co." },
      { name: "description", content: "Shop hours, address, phone, and accepted payment methods at Sharp & Co." },
      { property: "og:title", content: "Visit & Contact — Sharp & Co." },
      { property: "og:description", content: "Shop hours, address, phone, and accepted payment methods." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data } = useQuery({ queryKey: ["shop"], queryFn: fetchShopSettings });
  const map = data?.shop_address
    ? `https://www.google.com/maps?q=${encodeURIComponent(data.shop_address)}&output=embed`
    : null;

  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="text-4xl font-bold tracking-tight">Visit us</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Walk in or book ahead — we'll have a chair ready.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-5 p-6">
            <Info icon={MapPin} label="Address" value={data?.shop_address} />
            <Info icon={Phone} label="Phone" value={data?.shop_phone} />
            <Info icon={Mail} label="Email" value={data?.shop_email} />
            <Info
              icon={Clock}
              label="Hours"
              value={
                data?.open_time && data?.close_time
                  ? `${data.open_time.slice(0,5)} – ${data.close_time.slice(0,5)} daily`
                  : undefined
              }
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment accepted</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data?.payment_cash && <Badge variant="secondary"><Wallet className="mr-1 h-3 w-3" />Cash</Badge>}
                {data?.payment_gcash && <Badge variant="secondary">GCash</Badge>}
                {data?.payment_maya && <Badge variant="secondary">Maya</Badge>}
                {data?.payment_card && <Badge variant="secondary"><CreditCard className="mr-1 h-3 w-3" />Card</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="aspect-video w-full bg-muted">
            {map ? (
              <iframe src={map} className="h-full w-full" loading="lazy" title="Map" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <MapPin className="h-12 w-12" />
              </div>
            )}
          </div>
        </Card>
      </section>
    </SiteLayout>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}