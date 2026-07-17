import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Pencil, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Charity = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  event_date: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  location: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  video_url: "",
  event_date: "",
  sort_order: 0,
  is_active: true,
  location: "",
};

export function CharitiesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Charity | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: charities = [], isLoading } = useQuery<Charity[]>({
    queryKey: ["admin_charities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charities")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Charity[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Charity) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description ?? "",
      video_url: c.video_url ?? "",
      event_date: c.event_date ?? "",
      sort_order: c.sort_order,
      is_active: c.is_active,
      location: c.location ?? "",
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        video_url: form.video_url.trim() || null,
        event_date: form.event_date || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
        location: form.location.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (!payload.title) throw new Error("Title is required");

      if (editing) {
        const { error } = await supabase.from("charities").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("charities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Charity updated" : "Charity added");
      qc.invalidateQueries({ queryKey: ["admin_charities"] });
      qc.invalidateQueries({ queryKey: ["charities"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("charities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Charity deleted");
      qc.invalidateQueries({ queryKey: ["admin_charities"] });
      qc.invalidateQueries({ queryKey: ["charities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("charities").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_charities"] });
      qc.invalidateQueries({ queryKey: ["charities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Charities"
        subtitle="Manage charity entries displayed on the About Us page"
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Charity
          </Button>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && charities.length === 0 && (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No charities yet. Click "Add Charity" to create your first entry.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charities.map((c) => (
          <Card key={c.id} className={`transition-opacity ${!c.is_active ? "opacity-60" : ""}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base font-semibold truncate">{c.title}</CardTitle>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {c.event_date && (
                      <span>
                        {new Date(c.event_date + "T00:00:00").toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </span>
                    )}
                    {c.event_date && c.location && <span>•</span>}
                    {c.location && <span>📍 {c.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">
                    {c.is_active ? "Active" : "Hidden"}
                  </Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">#{c.sort_order}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              {c.video_url && (
                <p className="text-xs text-muted-foreground truncate mb-1" title={c.video_url}>
                  🎬 {c.video_url}
                </p>
              )}
              {c.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
              )}
            </CardContent>
            <CardFooter className="gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleActive.mutate({ id: c.id, is_active: !c.is_active })}
              >
                {c.is_active ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                {c.is_active ? "Hide" : "Show"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive ml-auto"
                onClick={() => {
                  if (confirm(`Delete "${c.title}"?`)) deleteMutation.mutate(c.id);
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Charity" : "Add Charity"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this charity entry. Changes are reflected on the About Us page."
                : "Add a new charity entry to display on the About Us page."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Charity Haircut Drive 2025"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the charity event or involvement..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Southside Branch, Community Center"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Video URL</Label>
              <Input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="YouTube, Vimeo, or direct video URL"
              />
              <p className="text-[11px] text-muted-foreground">
                Supports YouTube, Vimeo embed links, or direct .mp4/.webm file URLs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                />
                <p className="text-[11px] text-muted-foreground">Lower = shown first</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label className="cursor-pointer">Visible on About Us page</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Add Charity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
