import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Search } from "lucide-react";

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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["audit_logs"]["Row"];

const PAGE_SIZE = 50;

const ENTITY_TYPES = [
  "booking", "walk_in", "service", "barber",
  "schedule", "holiday", "time_off", "shop_settings",
];

function roleColor(role: string | null) {
  switch (role) {
    case "admin": return "default";
    case "staff": return "secondary";
    case "customer": return "outline";
    default: return "outline";
  }
}

function actionColor(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.endsWith(".deleted")) return "destructive";
  if (action.endsWith(".created")) return "default";
  if (action.includes("status_changed")) return "secondary";
  return "outline";
}

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

function diffKeys(before: unknown, after: unknown): string[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  return [...keys].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}

export function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [entity, setEntity] = useState<string>("all");
  const [actorSearch, setActorSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

  const queryKey = ["audit_logs", { page, entity, actorSearch, fromDate, toDate }];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
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

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCSV = () => {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
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
        title="Audit Logs"
        subtitle="Every change made in the system, recorded automatically."
        actions={
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={!rows.length}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Actor email…"
              className="pl-8"
              value={actorSearch}
              onChange={(e) => { setActorSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Entity type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} />
          <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No log entries match your filters.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{r.actor_email ?? "—"}</span>
                      <Badge variant={roleColor(r.actor_role)}>{r.actor_role ?? "unknown"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionColor(r.action)}>{r.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{r.entity_type}</div>
                    {r.entity_id && <div className="font-mono text-muted-foreground">{r.entity_id.slice(0, 8)}</div>}
                  </TableCell>
                  <TableCell className="max-w-[420px] truncate text-sm">{r.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total.toLocaleString()} entries</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {selected.action}
                </SheetTitle>
                <SheetDescription>{selected.summary}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
                  <div><div className="text-xs text-muted-foreground">When</div>{new Date(selected.created_at).toLocaleString()}</div>
                  <div><div className="text-xs text-muted-foreground">Actor</div>{selected.actor_email ?? "—"} <Badge className="ml-1" variant={roleColor(selected.actor_role)}>{selected.actor_role ?? "unknown"}</Badge></div>
                  <div><div className="text-xs text-muted-foreground">Entity</div>{selected.entity_type}</div>
                  <div><div className="text-xs text-muted-foreground">Entity ID</div><span className="font-mono text-xs">{selected.entity_id ?? "—"}</span></div>
                </div>

                {changedKeys.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Changed fields</h4>
                    <div className="space-y-2">
                      {changedKeys.map((k) => {
                        const b = (selected.before as Record<string, unknown> | null)?.[k];
                        const a = (selected.after as Record<string, unknown> | null)?.[k];
                        return (
                          <div key={k} className="rounded-md border p-2 text-xs">
                            <div className="mb-1 font-mono font-semibold">{k}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded bg-destructive/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">before</div><pre className="whitespace-pre-wrap break-all">{JSON.stringify(b, null, 2)}</pre></div>
                              <div className="rounded bg-primary/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">after</div><pre className="whitespace-pre-wrap break-all">{JSON.stringify(a, null, 2)}</pre></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selected.before && (
                  <details className="rounded-md border p-2">
                    <summary className="cursor-pointer text-xs font-semibold">Full before snapshot</summary>
                    <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(selected.before, null, 2)}</pre>
                  </details>
                )}
                {selected.after && (
                  <details className="rounded-md border p-2">
                    <summary className="cursor-pointer text-xs font-semibold">Full after snapshot</summary>
                    <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(selected.after, null, 2)}</pre>
                  </details>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}