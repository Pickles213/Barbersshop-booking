import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Star, Trash2, ImagePlus, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Barber = {
  id: string; name: string; specialization: string | null; experience_years: number;
  bio: string | null; rating: number; avatar_url: string | null; is_active: boolean;
};
type PortfolioItem = { id: string; barber_id: string; image_url: string };

const empty: Omit<Barber, "id"> = {
  name: "", specialization: "", experience_years: 0, bio: "", rating: 5, avatar_url: "", is_active: true,
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

function fileExtFromType(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return (file.type.split("/")[1] || "jpg").toLowerCase();
}

async function uploadImage(bucket: string, folder: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be smaller than 5MB");

  const path = `${folder}/${crypto.randomUUID()}.${fileExtFromType(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function BarbersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [form, setForm] = useState(empty);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [portfolioOf, setPortfolioOf] = useState<Barber | null>(null);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("*").order("name");
      if (error) throw error;
      return data as Barber[];
    },
  });

  const { data: portfolio = [] } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barber_portfolio").select("id, barber_id, image_url");
      if (error) throw error;
      return data as PortfolioItem[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      let avatar_url = form.avatar_url || null;
      if (avatarFile) {
        avatar_url = await uploadImage("barber-avatars", editing?.id ?? "new", avatarFile);
      }
      // rating is never set by the admin — it's calculated from customer reviews
      const { rating: _rating, ...rest } = form;
      const payload = { ...rest, avatar_url };
      if (editing) {
        const { error } = await supabase.from("barbers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("barbers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Barber updated" : "Barber added");
      setOpen(false); setEditing(null); setForm(empty); setAvatarFile(null); setAvatarPreview(null);
      qc.invalidateQueries({ queryKey: ["barbers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("barbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Barber removed"); qc.invalidateQueries({ queryKey: ["barbers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addImage = useMutation({
    mutationFn: async (file: File) => {
      if (!portfolioOf) throw new Error("No barber selected");
      const image_url = await uploadImage("barber-portfolio", portfolioOf.id, file);
      const { error } = await supabase.from("barber_portfolio").insert({
        barber_id: portfolioOf.id, image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portfolio"] }); toast.success("Photo added"); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setPortfolioUploading(false),
  });

  const removeImage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("barber_portfolio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });

  const startEdit = (b: Barber) => {
    setEditing(b);
    setForm({
      name: b.name, specialization: b.specialization ?? "", experience_years: b.experience_years,
      bio: b.bio ?? "", rating: b.rating, avatar_url: b.avatar_url ?? "", is_active: b.is_active,
    });
    setAvatarFile(null);
    setAvatarPreview(b.avatar_url ?? null);
    setOpen(true);
  };
  const startNew = () => {
    setEditing(null); setForm(empty); setAvatarFile(null); setAvatarPreview(null); setOpen(true);
  };

  const onAvatarChosen = (file: File | null) => {
    setAvatarFile(file);
    if (file) setAvatarPreview(URL.createObjectURL(file));
  };

  const onPortfolioFilesChosen = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPortfolioUploading(true);
    Array.from(files).forEach((file) => addImage.mutate(file));
    if (portfolioInputRef.current) portfolioInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Barbers"
        subtitle="Manage your team and their portfolios"
        actions={
          <Button size="sm" onClick={startNew}><Plus className="mr-2 h-4 w-4" />New barber</Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {barbers.map((b) => {
          const pics = portfolio.filter((p) => p.barber_id === b.id);
          return (
            <Card key={b.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14">
                    {b.avatar_url && <AvatarImage src={b.avatar_url} alt={b.name} />}
                    <AvatarFallback>{b.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{b.name}</CardTitle>
                    <p className="truncate text-xs text-muted-foreground">{b.specialization}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="gap-1"><Star className="h-3 w-3 fill-current" />{Number(b.rating).toFixed(1)}</Badge>
                      <span className="text-muted-foreground">{b.experience_years} yrs</span>
                      {!b.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pics.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No portfolio yet</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {pics.slice(0, 3).map((p) => (
                      <img key={p.id} src={p.image_url} alt="" className="aspect-square w-full rounded object-cover" />
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button size="sm" variant="outline" onClick={() => setPortfolioOf(b)}>
                  <ImagePlus className="mr-2 h-4 w-4" />Portfolio ({pics.length})
                </Button>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${b.name}?`)) remove.mutate(b.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit barber" : "New barber"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5"><Label>Specialization</Label>
              <Input value={form.specialization ?? ""} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Years of experience</Label>
                <Input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <div className="flex h-9 items-center gap-1.5 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-current text-foreground" />
                  <span className="font-medium text-foreground">{Number(form.rating).toFixed(1)}</span>
                  <span className="ml-1 text-xs">(from customer reviews)</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Photo</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  {avatarPreview && <AvatarImage src={avatarPreview} alt="" />}
                  <AvatarFallback>{form.name ? form.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "?"}</AvatarFallback>
                </Avatar>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatarChosen(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  {avatarPreview ? "Change photo" : "Upload photo"}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Bio</Label>
              <Textarea value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={!form.name.trim() || upsert.isPending}>
              {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portfolio dialog */}
      <Dialog open={!!portfolioOf} onOpenChange={(o) => !o && setPortfolioOf(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{portfolioOf?.name} — Portfolio</DialogTitle></DialogHeader>
          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPortfolioFilesChosen(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => portfolioInputRef.current?.click()}
            disabled={portfolioUploading}
          >
            {portfolioUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {portfolioUploading ? "Uploading…" : "Upload photos from computer"}
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {portfolio.filter((p) => p.barber_id === portfolioOf?.id).map((p) => (
              <div key={p.id} className="relative">
                <img src={p.image_url} alt="" className="aspect-square w-full rounded object-cover" />
                <Button
                  size="icon" variant="destructive"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => removeImage.mutate(p.id)}
                ><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
