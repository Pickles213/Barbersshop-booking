import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Clock, CalendarDays, Users, Pencil, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatTime } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AVATAR_COLORS = [
  { bg: "bg-teal-100", text: "text-teal-800" },
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-red-100", text: "text-red-800" },
  { bg: "bg-slate-100", text: "text-slate-700" },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function fmt12(time: string) {
  // Delegates to shared formatTime utility
  return formatTime(time);
}

export function SchedulesPage() {
  const qc = useQueryClient();
  const [editingBarber, setEditingBarber] = useState<string | null>(null);

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => (await supabase.from("barbers").select("id, name").order("name")).data ?? [],
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => (await supabase.from("schedules").select("*")).data ?? [],
  });

  const { data: timeOff = [] } = useQuery({
    queryKey: ["time_off"],
    queryFn: async () => {
      // 1. First try querying the admin view to get all columns including reason
      const { data, error } = await supabase
        .from("time_off_admin")
        .select("*, barber:barbers(name)")
        .order("start_date");

      if (!error && data) {
        return data as any[];
      }

      // Log warning for debug but fallback gracefully
      console.warn("Could not query time_off_admin, falling back to public time_off table without reason:", error);

      // 2. Fallback: Query time_off directly but only requesting columns that authenticated users have SELECT permission for
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("time_off")
        .select("id, barber_id, start_date, end_date, created_at, barber:barbers(name)")
        .order("start_date");

      if (fallbackError) {
        console.error("Failed to query time_off fallback:", fallbackError);
        throw fallbackError;
      }

      return (fallbackData || []).map((item) => ({
        ...item,
        reason: null, // Since column-level SELECT for reason is restricted, set to null
      })) as any[];
    },
  });

  const updateSched = useMutation({
    mutationFn: async (v: { id: string; patch: any }) => {
      const { error } = await supabase.from("schedules").update(v.patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [toForm, setToForm] = useState({ barber_id: "", start_date: "", end_date: "", reason: "" });

  const addTimeOff = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_off").insert(toForm);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Leave added");
      setToForm({ barber_id: "", start_date: "", end_date: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["time_off"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeTimeOff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_off").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time_off"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const today = new Date().getDay();
  const todayStr = new Date().toISOString().split("T")[0];

  const barbersOnLeaveToday = timeOff.filter(
    (t) => t.start_date <= todayStr && t.end_date >= todayStr
  );

  const barbersOnDutyCount = barbers.filter((b) => {
    const onLeave = barbersOnLeaveToday.some((t) => (t as any).barber_id === b.id);
    if (onLeave) return false;
    const sched = schedules.find((s) => s.barber_id === b.id && s.day_of_week === today);
    return sched && !sched.is_off;
  }).length;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Schedules"
        subtitle="Manage shift hours and days off for each barber."
      />

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">On duty today</p>
            <p className="text-lg font-semibold">{barbersOnDutyCount} of {barbers.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">On leave today</p>
            <p className="text-lg font-semibold">
              {barbersOnLeaveToday.length} {barbersOnLeaveToday.length === 1 ? "barber" : "barbers"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shop hours</p>
            <p className="text-lg font-semibold">10:00 AM – 8:00 PM</p>
          </div>
        </div>
      </div>

      {/* Barber schedule cards */}
      <div className="space-y-3">
        {barbers.map((b, idx) => {
          const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          const rows = DAYS.map((_, d) =>
            schedules.find((s) => s.barber_id === b.id && s.day_of_week === d)
          );
          const workingDays = rows.filter((s) => s && !s.is_off).length;
          const onLeave = barbersOnLeaveToday.some((t) => (t as any).barber_id === b.id);
          const isEditing = editingBarber === b.id;

          const workingRows = rows.filter((s) => s && !s.is_off);
          const uniqueTimes = [
            ...new Set(workingRows.map((s) => `${formatTime(s!.start_time.slice(0, 5))}–${formatTime(s!.end_time.slice(0, 5))}`)),
          ];

          return (
            <Card key={b.id} className={cn("transition-all", onLeave && "border-amber-200 bg-amber-50/30")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      color.bg,
                      color.text
                    )}
                  >
                    {getInitials(b.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{b.name}</span>
                      {onLeave ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-700 text-xs">
                          On leave today
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-300 bg-green-100 text-green-700 text-xs">
                          Active
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{workingDays} working days/week</span>
                    </div>

                    {!isEditing && (
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS.map((day, d) => {
                          const s = rows[d];
                          const working = s && !s.is_off;
                          return (
                            <div
                              key={day}
                              className={cn(
                                "flex h-7 w-9 flex-col items-center justify-center rounded text-[10px] font-medium",
                                working
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!isEditing && uniqueTimes.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {uniqueTimes.length === 1
                          ? (() => {
                              const [start, end] = uniqueTimes[0].split("–");
                              return `${fmt12(start)} – ${fmt12(end)} every working day`;
                            })()
                          : uniqueTimes.join(" · ")}
                      </p>
                    )}

                    {isEditing && (
                      <div className="mt-2 space-y-3">
                        <div>
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Tap a day to mark it working or off
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {DAYS.map((day, d) => {
                              const s = rows[d];
                              const working = !!s && !s.is_off;
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  disabled={!s}
                                  onClick={() => s && updateSched.mutate({ id: s.id, patch: { is_off: !s.is_off } })}
                                  className={cn(
                                    "flex h-7 w-9 flex-col items-center justify-center rounded text-[10px] font-medium transition-colors",
                                    working
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                                    !s && "opacity-40 cursor-not-allowed"
                                  )}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {workingRows.length > 0 ? (
                          <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              Set shift hours for working days
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                              {DAYS.map((day, d) => {
                                const s = rows[d];
                                if (!s || s.is_off) return null;
                                return (
                                  <div key={day} className="space-y-1.5 rounded-lg border p-2 text-xs min-w-0">
                                    <p className="text-center font-medium">{day}</p>
                                    <Input
                                      type="time"
                                      defaultValue={s.start_time.slice(0, 5)}
                                      onBlur={(e) =>
                                        updateSched.mutate({ id: s.id, patch: { start_time: e.target.value } })
                                      }
                                      className="h-6 px-1 text-xs"
                                    />
                                    <Input
                                      type="time"
                                      defaultValue={s.end_time.slice(0, 5)}
                                      onBlur={(e) =>
                                        updateSched.mutate({ id: s.id, patch: { end_time: e.target.value } })
                                      }
                                      className="h-6 px-1 text-xs"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No working days selected — tap a day above to add shift hours.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => setEditingBarber(isEditing ? null : b.id)}
                  >
                    {isEditing ? (
                      <><Check className="mr-1.5 h-3.5 w-3.5" /> Done</>
                    ) : (
                      <><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Time off section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Time off and leaves</CardTitle>
          <p className="text-xs text-muted-foreground">Record upcoming leaves for any barber.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add a leave</p>
            <div className="grid grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Barber</Label>
                <Select value={toForm.barber_id} onValueChange={(v) => setToForm({ ...toForm, barber_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select barber" /></SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Start date</Label>
                <Input type="date" className="h-8 text-xs" value={toForm.start_date} onChange={(e) => setToForm({ ...toForm, start_date: e.target.value })} />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">End date</Label>
                <Input type="date" className="h-8 text-xs" value={toForm.end_date} onChange={(e) => setToForm({ ...toForm, end_date: e.target.value })} />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <Input className="h-8 text-xs" placeholder="e.g. Family, Sick, Vacation" value={toForm.reason} onChange={(e) => setToForm({ ...toForm, reason: e.target.value })} />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button size="sm" className="h-8 w-full text-xs" onClick={() => addTimeOff.mutate()}
                  disabled={!toForm.barber_id || !toForm.start_date || !toForm.end_date || addTimeOff.isPending}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add leave
                </Button>
              </div>
            </div>
          </div>

          {timeOff.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No upcoming leaves recorded.</p>
          ) : (
            <div className="divide-y rounded-lg border overflow-hidden">
              {timeOff.map((t) => {
                const barberIdx = barbers.findIndex((b) => b.id === (t as any).barber_id);
                const color = AVATAR_COLORS[barberIdx % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
                const start = new Date(t.start_date + "T00:00:00");
                const end = new Date(t.end_date + "T00:00:00");
                const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
                const fmtDate = (d: Date) =>
                  d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
                return (
                  <div key={t.id} className="flex items-center gap-3 bg-card px-4 py-3">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", color.bg, color.text)}>
                      {getInitials((t as any).barber?.name ?? "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{(t as any).barber?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(start)} – {fmtDate(end)} · {days} day{days !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {t.reason && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">{t.reason}</span>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeTimeOff.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}