import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Filter, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format-duration";

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

const empty: Omit<Service, "id"> = {
  name: "", description: "", category: "Haircut", price: 0, duration_minutes: 30, is_active: true,
};

type SortField = "name" | "price" | "duration_minutes" | "category";
type SortDir = "asc" | "desc";

export function ServicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);
  const [customCategory, setCustomCategory] = useState("");

  // Filters
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const categoriesList = useMemo(() => {
    const raw = Array.from(
      new Set([
        "Haircut",
        "Beard",
        "Shave",
        "Combo",
        "Other",
        ...services.map((s) => s.category).filter(Boolean),
      ])
    );
    return raw.sort((a, b) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [services]);

  const upsert = useMutation({
    mutationFn: async () => {
      const finalCategory = form.category === "custom-new" ? customCategory.trim() : form.category;
      if (!finalCategory) {
        throw new Error("Please enter a category name");
      }
      
      const payload = {
        ...form,
        category: finalCategory,
      };

      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Service updated" : "Service created");
      setOpen(false);
      setEditing(null);
      setForm(empty);
      setCustomCategory("");
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (s: Service) => {
      const { error } = await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  const startEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name, description: s.description ?? "", category: s.category,
      price: s.price, duration_minutes: s.duration_minutes, is_active: s.is_active,
    });
    setCustomCategory("");
    setOpen(true);
  };
  const startNew = () => { 
    setEditing(null); 
    setForm(empty); 
    setCustomCategory("");
    setOpen(true); 
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = services;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterCategory !== "All") {
      list = list.filter((s) => s.category === filterCategory);
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "price":
          cmp = a.price - b.price;
          break;
        case "duration_minutes":
          cmp = a.duration_minutes - b.duration_minutes;
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [services, search, filterCategory, sortField, sortDir]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
    >
      {children}
      <ArrowUpDown className={cn(
        "h-3 w-3 transition-opacity",
        sortField === field ? "opacity-100" : "opacity-30"
      )} />
    </button>
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Services"
        subtitle="Manage service catalog, prices and durations"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={startNew}><Plus className="mr-2 h-4 w-4" />New service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categoriesList.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        <SelectItem value="custom-new">+ Add new category...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Price (₱)</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Hours"
                        value={Math.floor(form.duration_minutes / 60) || ""}
                        onChange={(e) => {
                          const hrs = Math.max(0, parseInt(e.target.value) || 0);
                          const mins = form.duration_minutes % 60;
                          setForm({ ...form, duration_minutes: hrs * 60 + mins });
                        }}
                      />
                      <span className="text-xs text-zinc-500 font-mono">hr</span>
                    </div>
                    <div className="flex-1 flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="Minutes"
                        value={form.duration_minutes % 60 || ""}
                        onChange={(e) => {
                          const hrs = Math.floor(form.duration_minutes / 60);
                          const mins = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                          setForm({ ...form, duration_minutes: hrs * 60 + mins });
                        }}
                      />
                      <span className="text-xs text-zinc-500 font-mono">min</span>
                    </div>
                  </div>
                </div>

                {form.category === "custom-new" && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label>Custom Category Name</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="e.g. Nail Care, Hair Color" 
                        value={customCategory} 
                        onChange={(e) => setCustomCategory(e.target.value)} 
                        autoFocus
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setForm({ ...form, category: "Haircut" });
                          setCustomCategory("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => upsert.mutate()} disabled={upsert.isPending || !form.name.trim()}>
                  {editing ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-base font-medium">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 shrink-0" />
              <Input className="max-w-xs" placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {categoriesList.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterCategory !== "All" && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setFilterCategory("All")}>
                  Clear
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortableHeader field="name">Name</SortableHeader></TableHead>
                <TableHead><SortableHeader field="category">Category</SortableHeader></TableHead>
                <TableHead><SortableHeader field="price">Price</SortableHeader></TableHead>
                <TableHead><SortableHeader field="duration_minutes">Duration</SortableHeader></TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No services found.</TableCell></TableRow>
              )}
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                  <TableCell>₱{Number(s.price).toLocaleString()}</TableCell>
                  <TableCell>{formatDuration(s.duration_minutes)}</TableCell>
                  <TableCell>
                    <Switch checked={s.is_active} onCheckedChange={() => toggle.mutate(s)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${s.name}?`)) remove.mutate(s.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
