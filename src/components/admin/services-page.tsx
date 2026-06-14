import { useState } from "react";
import { Pencil, Plus, Scissors, Search, Trash2 } from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { formatPHP } from "@/lib/mock-data";

interface Row {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  is_active: boolean;
  bookings: number;
}

const seed: Row[] = [
  { id: "s1", name: "Classic Fade", description: "Tapered fade with scissor work on top.", price: 450, duration_minutes: 45, category: "Haircut", is_active: true, bookings: 184 },
  { id: "s2", name: "Skin Fade", description: "Bald fade with sharp lineup.", price: 500, duration_minutes: 50, category: "Haircut", is_active: true, bookings: 142 },
  { id: "s3", name: "Beard Trim", description: "Shape, line and condition.", price: 250, duration_minutes: 25, category: "Beard", is_active: true, bookings: 121 },
  { id: "s4", name: "Hot Towel Shave", description: "Straight razor with hot towel finish.", price: 600, duration_minutes: 40, category: "Beard", is_active: true, bookings: 88 },
  { id: "s5", name: "Hair + Beard Combo", description: "Full haircut and beard service.", price: 750, duration_minutes: 75, category: "Combo", is_active: true, bookings: 96 },
  { id: "s6", name: "Kids Cut", description: "Cuts for children 12 and below.", price: 300, duration_minutes: 30, category: "Haircut", is_active: true, bookings: 64 },
  { id: "s7", name: "Hair Color", description: "Single-tone color with toner.", price: 1200, duration_minutes: 90, category: "Color", is_active: false, bookings: 22 },
];

export function ServicesPage() {
  const [rows, setRows] = useState<Row[]>(seed);
  const [q, setQ] = useState("");

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.category.toLowerCase().includes(q.toLowerCase()),
  );

  const toggle = (id: string) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r)));

  const stats = [
    { label: "Total Services", value: rows.length },
    { label: "Active", value: rows.filter((r) => r.is_active).length },
    { label: "Avg. Price", value: formatPHP(rows.reduce((s, r) => s + r.price, 0) / rows.length) },
    { label: "Avg. Duration", value: `${Math.round(rows.reduce((s, r) => s + r.duration_minutes, 0) / rows.length)} min` },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Services" subtitle="Manage your service catalog" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services or category" className="pl-9" />
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Service
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                          <Scissors className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{r.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{r.category}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{r.duration_minutes} min</TableCell>
                    <TableCell className="font-medium">{formatPHP(r.price)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.bookings}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggle(r.id)} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}