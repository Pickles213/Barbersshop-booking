import { Bell, Moon, Search, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

const SEEN_KEY = "seen_audit_ids";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type SeenEntry = { id: string; ts: number };

type AuditRow = {
  id: string;
  action: string;
  after: Record<string, unknown> | null;
  created_at: string;
};

type Notif = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

function readSeen(): SeenEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return parsed.filter(
      (e): e is SeenEntry =>
        e && typeof e.id === "string" && typeof e.ts === "number" && e.ts >= cutoff,
    );
  } catch {
    return [];
  }
}

function writeSeen(entries: SeenEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function toNotif(row: AuditRow): Notif | null {
  const after = (row.after ?? {}) as Record<string, unknown>;
  const name = (after.customer_name as string) ?? "Someone";
  const date = (after.booking_date as string) ?? "";
  const time = (after.start_time as string) ?? "";
  if (row.action === "booking.created") {
    return {
      id: row.id,
      title: "New booking",
      message: `${name} booked on ${date} at ${time}`,
      created_at: row.created_at,
    };
  }
  if (row.action === "booking.status_changed" && after.status === "cancelled") {
    return {
      id: row.id,
      title: "Booking cancelled",
      message: `${name}'s booking on ${date} was cancelled`,
      created_at: row.created_at,
    };
  }
  return null;
}

export function AdminTopbar() {
  const [isDark, setIsDark] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof document === "undefined") return;
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    const entries = readSeen();
    writeSeen(entries); // prune >7d
    setSeenIds(new Set(entries.map((e) => e.id)));
  }, []);

  const { data: rows = [] } = useQuery({
    queryKey: ["topbar-notifications"],
    queryFn: async () => {
      const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, after, created_at")
        .eq("entity_type", "booking")
        .in("action", ["booking.created", "booking.status_changed"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const notifs = useMemo(
    () => rows.map(toNotif).filter((n): n is Notif => n !== null),
    [rows],
  );

  const unread = notifs.filter((n) => !seenIds.has(n.id)).length;

  const handleOpen = (open: boolean) => {
    if (!open) return;
    const existing = readSeen();
    const map = new Map(existing.map((e) => [e.id, e.ts]));
    const now = Date.now();
    for (const n of notifs) if (!map.has(n.id)) map.set(n.id, now);
    const merged = Array.from(map, ([id, ts]) => ({ id, ts }));
    writeSeen(merged);
    setSeenIds(new Set(merged.map((e) => e.id)));
  };

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger className="shrink-0" />
      <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search bookings, customers, barbers…" className="pl-8" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu onOpenChange={handleOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="border-b px-3 py-2 text-sm font-semibold">Notifications</div>
            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                notifs.map((n) => {
                  const isUnread = !seenIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`border-b px-3 py-2.5 last:border-b-0 ${isUnread ? "bg-accent/40" : ""}`}
                    >
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.message}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {relativeTime(n.created_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Link
              to="/admin/audit-logs"
              className="block border-t px-3 py-2 text-center text-sm font-medium text-primary hover:bg-accent"
            >
              View all
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
        <Avatar className="ml-1 h-8 w-8">
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}