import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, "");
  const maxLen = cleaned.startsWith("+") ? 13 : 11;
  return cleaned.slice(0, maxLen);
}

function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["shop_settings"],
    queryFn: async () => (await supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [s, setS] = useState<any>(null);
  useEffect(() => { if (settings) setS(settings); }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const normalized = normalizePhPhone(s.shop_phone ?? "");
      if (s.shop_phone && !normalized) {
        throw new Error("Invalid phone number. Please use Philippine format (e.g. 09171234567 or +639171234567).");
      }
      const updatedSettings = {
        ...s,
        shop_phone: normalized || s.shop_phone,
      };
      const { error } = await supabase.from("shop_settings").update(updatedSettings).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["shop_settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => (await supabase.from("holidays").select("*").order("holiday_date")).data ?? [],
  });
  const [hName, setHName] = useState(""); const [hDate, setHDate] = useState("");
  const addHoliday = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("holidays").insert({ name: hName, holiday_date: hDate });
      if (error) throw error;
    },
    onSuccess: () => { setHName(""); setHDate(""); qc.invalidateQueries({ queryKey: ["holidays"] }); toast.success("Holiday added"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeHoliday = useMutation({
    mutationFn: async (id: string) => { await supabase.from("holidays").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["holidays"] }),
  });

  if (!s) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Settings"
        subtitle="Shop information and operating hours"
        actions={<Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Save</Button>}
      />

      <Card>
        <CardHeader><CardTitle>Shop info</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5 min-w-0"><Label>Shop name</Label><Input value={s.shop_name ?? ""} onChange={(e) => setS({ ...s, shop_name: e.target.value })} /></div>
          <div className="space-y-1.5 min-w-0"><Label>Email</Label><Input value={s.shop_email ?? ""} onChange={(e) => setS({ ...s, shop_email: e.target.value })} /></div>
          <div className="space-y-1.5 min-w-0">
            <Label>Phone</Label>
            <Input
              value={s.shop_phone ?? ""}
              onChange={(e) => setS({ ...s, shop_phone: sanitizePhoneInput(e.target.value) })}
              placeholder="09171234567"
              maxLength={13}
            />
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Philippine format, e.g. 09171234567 or +639171234567
            </p>
          </div>
          <div className="space-y-1.5 min-w-0"><Label>Address</Label><Input value={s.shop_address ?? ""} onChange={(e) => setS({ ...s, shop_address: e.target.value })} /></div>
          <div className="space-y-1.5 min-w-0"><Label>Opening time</Label><Input type="time" value={s.open_time?.slice(0,5) ?? ""} onChange={(e) => setS({ ...s, open_time: e.target.value })} /></div>
          <div className="space-y-1.5 min-w-0"><Label>Closing time</Label><Input type="time" value={s.close_time?.slice(0,5) ?? ""} onChange={(e) => setS({ ...s, close_time: e.target.value })} /></div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Holidays</CardTitle>
          <CardDescription>Days the shop is closed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input placeholder="Holiday name" value={hName} onChange={(e) => setHName(e.target.value)} className="flex-1 min-w-0" />
            <Input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} className="w-full md:w-[200px] shrink-0 min-w-0" />
            <Button onClick={() => addHoliday.mutate()} disabled={!hName || !hDate} className="w-full md:w-auto shrink-0"><Plus className="mr-2 h-4 w-4" />Add</Button>
          </div>
          <div className="space-y-2">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{h.holiday_date} · {h.name}</span>
                <Button size="icon" variant="ghost" onClick={() => removeHoliday.mutate(h.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
