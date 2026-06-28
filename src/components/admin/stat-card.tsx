import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: "primary" | "emerald" | "amber" | "rose" | "sky" | "violet";
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-500",
  amber: "bg-amber-500/10 text-amber-500",
  rose: "bg-rose-500/10 text-rose-500",
  sky: "bg-sky-500/10 text-sky-500",
  violet: "bg-violet-500/10 text-violet-500",
};

export function StatCard({ label, value, hint, icon: Icon, trend, accent = "primary" }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <p
            className={cn(
              "mt-3 text-xs font-medium",
              trend.positive ? "text-emerald-500" : "text-rose-500",
            )}
          >
            {trend.positive ? "▲" : "▼"} {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}