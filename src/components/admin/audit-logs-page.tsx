import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download, FileText, Calendar, Scissors, User,
  CheckCircle, Clock, AlertTriangle, Info,
} from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["audit_logs"]["Row"];

const PAGE_SIZE = 50;

// ── Human-readable labels (holidays, time_off, shop_settings excluded) ────────

const ENTITY_LABELS: Record<string, string> = {
  booking: "Bookings",
  walk_in: "Walk-ins",
  service: "Services",
  barber:  "Barbers",
  schedule: "Schedules",
};

const ENTITY_FILTER_OPTIONS = Object.entries(ENTITY_LABELS);

// Entity types to exclude from the log entirely
const EXCLUDED_ENTITY_TYPES = new Set(["holiday", "time_off", "shop_settings"]);

function friendlyAction(action: string, entityType: string | null): string {
  const entity = entityType ?? "";
  if (action.endsWith(".created")) {
    if (entity === "booking")  return "New booking created";
    if (entity === "walk_in")  return "Walk-in added";
    if (entity === "service")  return "New service added";
    if (entity === "barber")   return "New barber added";
    return "New record created";
  }
  if (action.endsWith(".updated")) {
    if (entity === "service")  return "Service updated";
    if (entity === "barber")   return "Barber info updated";
    if (entity === "schedule") return "Schedule updated";
    return "Record updated";
  }
  if (action.endsWith(".deleted")) {
    if (entity === "booking")  return "Booking removed";
    if (entity === "service")  return "Service removed";
    if (entity === "barber")   return "Barber removed";
    return "Record deleted";
  }
  if (action.includes("status_changed")) {
    if (entity === "booking")  return "Booking status changed";
    if (entity === "walk_in")  return "Walk-in marked as done";
    return "Status changed";
  }
  return action;
}

// ── Icon & color per entity type ─────────────────────────────────────────────

type IconConfig = { Icon: React.ElementType; bg: string; text: string };

function entityIcon(type: string | null): IconConfig {
  switch (type) {
    case "booking":  return { Icon: Calendar,     bg: "bg-primary/10",       text: "text-primary" };
    case "walk_in":  return { Icon: CheckCircle,  bg: "bg-emerald-500/10",  text: "text-emerald-500" };
    case "service":  return { Icon: Scissors,     bg: "bg-amber-500/10",    text: "text-amber-500" };
    case "barber":   return { Icon: User,         bg: "bg-violet-500/10",   text: "text-violet-500" };
    case "schedule": return { Icon: Clock,        bg: "bg-sky-500/10",      text: "text-sky-500" };
    default:         return { Icon: AlertTriangle, bg: "bg-muted",          text: "text-muted-foreground" };
  }
}

function actionBadgeVariant(action: string): "destructive" | "default" | "secondary" | "outline" {
  if (action.endsWith(".deleted"))       return "destructive";
  if (action.endsWith(".created"))       return "default";
  if (action.includes("status_changed")) return "secondary";
  return "outline";
}

function actionBadgeLabel(action: string): string {
  if (action.endsWith(".deleted"))       return "Removed";
  if (action.endsWith(".created"))       return "Created";
  if (action.includes("status_changed")) return "Status change";
  return "Updated";
}

function actorVariant(role: string | null): "default" | "secondary" | "outline" {
  if (role === "admin") return "default";
  if (role === "staff") return "secondary";
  return "outline";
}

function actorLabel(role: string | null) {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  return "Customer";
}

// ── CSV export ────────────────────────────────────────────────────────────────

function toCSV(rows: Row[]) {
  const header = ["created_at", "actor_email", "actor_role", "action", "entity_type", "entity_id", "summary"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header.join(","), ...rows.map((r) =>
    header.map((h) => esc((r as unknown as Record<string, unknown>)[h])).join(",")
  )].join("\n");
}

// ── Diff helper ───────────────────────────────────────────────────────────────

function diffKeys(before: unknown, after: unknown): string[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  return [...keys].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}

function friendlyFieldName(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function friendlyValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

// ── Friendly timestamp ────────────────────────────────────────────────────────

function friendlyTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditLogsPage() {
  const [page, setPage]               = useState(0);
  const [entity, setEntity]           = useState<string>("all");
  const [actorSearch, setActorSearch] = useState("");
  const [fromDate, setFromDate]       = useState("");
  const [toDate, setToDate]           = useState("");
  const [selected, setSelected]       = useState<Row | null>(null);

  const queryKey = ["audit_logs", { page, entity, actorSearch, fromDate, toDate }];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      // Always exclude hidden entity types
      const excluded = [...EXCLUDED_ENTITY_TYPES];

      let q = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .not("entity_type", "in", `(${excluded.join(",")})`)
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (entity !== "all") q = q.eq("entity_type", entity);
      if (actorSearch.trim()) q = q.ilike("actor_email", `%${actorSearch.trim()}%`);
      if (fromDate) q = q.gte("created_at", new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }

      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });

  const rows       = data?.rows ?? [];
  const total      = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCSV = () => {
    const csv  = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const changedKeys = useMemo(
    () => (selected ? diffKeys(selected.before, selected.after) : []),
    [selected]
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Activity Log"
        subtitle="A record of everything that has happened in your shop — bookings, walk-ins, and changes made by staff."
        actions={
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={!rows.length}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* ── 3-month retention notice ── */}
      <div className="flex items-start gap-2.5 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
        <span>
          Activity logs are kept for <strong>3 months</strong> and then automatically removed to save storage.
          Use <strong>Export CSV</strong> if you need to keep a permanent record.
        </span>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            {/* Category dropdown */}
            <Select
              value={entity}
              onValueChange={(v) => { setEntity(v); setPage(0); }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activity</SelectItem>
                {ENTITY_FILTER_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Email search */}
            <div className="relative flex-1 min-w-48">
              <User className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email…"
                className="pl-8"
                value={actorSearch}
                onChange={(e) => { setActorSearch(e.target.value); setPage(0); }}
              />
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">From</span>
              <Input
                type="date"
                className="w-38"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                className="w-38"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Log cards ── */}
      <div className="space-y-2">
        {isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading activity…</div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No activity found for the selected filters.
          </div>
        )}
        {rows.map((r) => {
          const { Icon, bg, text } = entityIcon(r.entity_type);
          const { date, time }     = friendlyTime(r.created_at);
          return (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className="flex items-start gap-4 rounded-xl border bg-card px-4 py-3.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
            >
              {/* Icon */}
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
                <Icon className={`h-4 w-4 ${text}`} />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">
                    {friendlyAction(r.action, r.entity_type)}
                  </span>
                  <Badge variant={actionBadgeVariant(r.action)} className="text-xs">
                    {actionBadgeLabel(r.action)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{r.summary}</p>
              </div>

              {/* Right meta */}
              <div className="shrink-0 flex flex-col items-end gap-1.5 ml-2">
                <div className="text-xs text-muted-foreground whitespace-nowrap">{date} · {time}</div>
                <Badge variant={actorVariant(r.actor_role)} className="text-xs">
                  {actorLabel(r.actor_role)}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total.toLocaleString()} {total === 1 ? "entry" : "entries"}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* ── Detail sheet ── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (() => {
            const { Icon, bg, text } = entityIcon(selected.entity_type);
            const { date, time }     = friendlyTime(selected.created_at);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${bg}`}>
                      <Icon className={`h-4 w-4 ${text}`} />
                    </div>
                    {friendlyAction(selected.action, selected.entity_type)}
                  </SheetTitle>
                  <SheetDescription>{selected.summary}</SheetDescription>
                </SheetHeader>

                <div className="mt-5 space-y-5 text-sm">
                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/40 p-4">
                    <div>
                      <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">When</div>
                      <div className="text-foreground">{date}</div>
                      <div className="text-xs text-muted-foreground">{time}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Done by</div>
                      <div className="text-foreground">{selected.actor_email ?? "—"}</div>
                      <Badge variant={actorVariant(selected.actor_role)} className="mt-1 text-xs">
                        {actorLabel(selected.actor_role)}
                      </Badge>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</div>
                      <div className="text-foreground">{ENTITY_LABELS[selected.entity_type ?? ""] ?? selected.entity_type ?? "—"}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Record ID</div>
                      <div className="font-mono text-xs text-muted-foreground">{selected.entity_id?.slice(0, 8) ?? "—"}</div>
                    </div>
                  </div>

                  {/* Changed fields — friendly view */}
                  {changedKeys.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold">What changed</h4>
                      <div className="space-y-2">
                        {changedKeys.map((k) => {
                          const before = (selected.before as Record<string, unknown> | null)?.[k];
                          const after  = (selected.after  as Record<string, unknown> | null)?.[k];
                          return (
                            <div key={k} className="rounded-xl border bg-card p-3">
                              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                                {friendlyFieldName(k)}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2">
                                  <div className="mb-1 text-[10px] font-medium uppercase text-rose-600">Before</div>
                                  <div className="text-rose-700 break-all">{friendlyValue(before)}</div>
                                </div>
                                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                                  <div className="mb-1 text-[10px] font-medium uppercase text-emerald-600">After</div>
                                  <div className="text-emerald-700 break-all">{friendlyValue(after)}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Raw snapshots — collapsed */}
                  {(selected.before || selected.after) && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full details</h4>
                      {selected.before && (
                        <details className="rounded-xl border p-3">
                          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                            <FileText className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                            Previous snapshot
                          </summary>
                          <pre className="mt-2 overflow-auto text-xs text-muted-foreground">{JSON.stringify(selected.before, null, 2)}</pre>
                        </details>
                      )}
                      {selected.after && (
                        <details className="rounded-xl border p-3">
                          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                            <FileText className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                            Updated snapshot
                          </summary>
                          <pre className="mt-2 overflow-auto text-xs text-muted-foreground">{JSON.stringify(selected.after, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
