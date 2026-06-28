import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SchedulesPage() {
  const qc = useQueryClient();
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
    queryFn: async () => (await supabase.from("time_off").select("*, barber:barbers(name)").order("start_date")).data ?? [],
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
      toast.success("Time off added");
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
  });

  return (
    <div className="space-y-6">
      <DashboardHeader title="Schedules" subtitle="Weekly shifts and time off" />

      {barbers.map((b) => {
        const rows = DAYS.map((_, d) => schedules.find((s) => s.barber_id === b.id && s.day_of_week === d));
        return (
          <Card key={b.id}>
            <CardHeader><CardTitle className="text-base">{b.name}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="grid min-w-[700px] grid-cols-7 gap-2">
                {DAYS.map((d, i) => {
                  const s = rows[i];
                  if (!s) return <div key={d} className="rounded border p-2 text-center text-xs text-muted-foreground">{d}<br/>—</div>;
                  return (
                    <div key={d} className="space-y-1 rounded border p-2 text-xs">
                      <div className="font-medium">{d}</div>
                      <div className="flex items-center gap-1">
                        <Switch checked={!s.is_off} onCheckedChange={(v) => updateSched.mutate({ id: s.id, patch: { is_off: !v } })} />
                        <span className="text-muted-foreground">{s.is_off ? "Off" : "On"}</span>
                      </div>
                      <Input type="time" disabled={s.is_off} value={s.start_time.slice(0,5)} onChange={(e) => updateSched.mutate({ id: s.id, patch: { start_time: e.target.value } })} className="h-7" />
                      <Input type="time" disabled={s.is_off} value={s.end_time.slice(0,5)} onChange={(e) => updateSched.mutate({ id: s.id, patch: { end_time: e.target.value } })} className="h-7" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Time off</CardTitle>
          <CardDescription>Add upcoming leaves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <Select value={toForm.barber_id} onValueChange={(v) => setToForm({ ...toForm, barber_id: v })}>
              <SelectTrigger><SelectValue placeholder="Barber" /></SelectTrigger>
              <SelectContent>{barbers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={toForm.start_date} onChange={(e) => setToForm({ ...toForm, start_date: e.target.value })} />
            <Input type="date" value={toForm.end_date} onChange={(e) => setToForm({ ...toForm, end_date: e.target.value })} />
            <Input placeholder="Reason" value={toForm.reason} onChange={(e) => setToForm({ ...toForm, reason: e.target.value })} />
            <Button onClick={() => addTimeOff.mutate()} disabled={!toForm.barber_id || !toForm.start_date || !toForm.end_date}>
              <Plus className="mr-2 h-4 w-4" />Add
            </Button>
          </div>
          <div className="space-y-2">
            {timeOff.length === 0 && <p className="text-sm text-muted-foreground">No upcoming time off.</p>}
            {timeOff.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <div className="font-medium">{(t as any).barber?.name}</div>
                  <div className="text-xs text-muted-foreground">{t.start_date} → {t.end_date} · {t.reason}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeTimeOff.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <Label className="hidden">_</Label>
        </CardContent>
      </Card>
    </div>
  );
}
