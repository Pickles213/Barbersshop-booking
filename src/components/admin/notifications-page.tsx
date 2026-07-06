import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2 } from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notifications").update({ is_read: true }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: async () => { await supabase.from("notifications").update({ is_read: true }).eq("is_read", false); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notifications").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Notifications"
        subtitle={`${unread} unread`}
        actions={<Button size="sm" variant="outline" onClick={() => markAll.mutate()} disabled={!unread}><Check className="mr-2 h-4 w-4" />Mark all read</Button>}
      />
      <div className="space-y-2">
        {items.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No notifications.</p>}
        {items.map((n) => (
          <Card key={n.id} className={n.is_read ? "opacity-70" : ""}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="flex gap-3">
                <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.is_read && <Badge>New</Badge>}
                    <Badge variant="outline">{n.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {!n.is_read && <Button size="icon" variant="ghost" onClick={() => markRead.mutate(n.id)}><Check className="h-4 w-4" /></Button>}
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(n.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
