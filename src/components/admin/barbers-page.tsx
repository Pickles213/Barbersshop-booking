import { useMemo, useRef, useState } from "react";
import { ImagePlus, Star, Upload, Trash2, Images } from "lucide-react";

import { DashboardHeader } from "./dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mockBarbers, type MockBarber } from "@/lib/mock-data";

type PortfolioMap = Record<string, string[]>;

export function BarbersPage() {
  const initial = useMemo<PortfolioMap>(
    () => Object.fromEntries(mockBarbers.map((b) => [b.id, [...b.portfolio]])),
    [],
  );
  const [portfolios, setPortfolios] = useState<PortfolioMap>(initial);
  const [openBarber, setOpenBarber] = useState<MockBarber | null>(null);

  const addImages = (barberId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const readers = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(file);
        }),
    );
    Promise.all(readers).then((urls) => {
      setPortfolios((prev) => ({
        ...prev,
        [barberId]: [...urls, ...(prev[barberId] ?? [])],
      }));
    });
  };

  const removeImage = (barberId: string, index: number) => {
    setPortfolios((prev) => ({
      ...prev,
      [barberId]: prev[barberId].filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Barbers"
        subtitle="Manage your team and showcase their work"
        showActions={false}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mockBarbers.map((b) => {
          const works = portfolios[b.id] ?? [];
          return (
            <Card key={b.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback>{b.avatar_initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate text-base">{b.name}</CardTitle>
                    <Badge variant={b.is_active ? "default" : "secondary"} className="shrink-0">
                      {b.is_active ? "Active" : "Off"}
                    </Badge>
                  </div>
                  <CardDescription className="truncate">{b.specialization}</CardDescription>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{b.experience_years} yrs exp</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {b.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{b.bio}</p>

                <div className="grid grid-cols-3 gap-1.5">
                  {works.slice(0, 3).map((src, i) => (
                    <div
                      key={i}
                      className="aspect-square overflow-hidden rounded-md bg-muted"
                    >
                      <img
                        src={src}
                        alt={`${b.name} work ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - works.length) }).map((_, i) => (
                    <div
                      key={`ph-${i}`}
                      className="grid aspect-square place-items-center rounded-md border border-dashed text-muted-foreground"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">
                    {works.length} {works.length === 1 ? "photo" : "photos"}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setOpenBarber(b)}>
                    <Images className="mr-2 h-4 w-4" />
                    Manage portfolio
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PortfolioDialog
        barber={openBarber}
        images={openBarber ? portfolios[openBarber.id] ?? [] : []}
        onClose={() => setOpenBarber(null)}
        onAdd={(files) => openBarber && addImages(openBarber.id, files)}
        onRemove={(i) => openBarber && removeImage(openBarber.id, i)}
      />
    </div>
  );
}

interface PortfolioDialogProps {
  barber: MockBarber | null;
  images: string[];
  onClose: () => void;
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}

function PortfolioDialog({ barber, images, onClose, onAdd, onRemove }: PortfolioDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={!!barber} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{barber?.name} · Portfolio</DialogTitle>
          <DialogDescription>
            Showcase work that customers will see when booking with {barber?.name.split(" ")[0]}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {images.length} {images.length === 1 ? "photo" : "photos"} uploaded
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onAdd(e.target.files);
              e.target.value = "";
            }}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload photos
          </Button>
        </div>

        {images.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No photos yet</p>
            <p className="text-xs text-muted-foreground">
              Upload pictures of haircuts, fades, beards and styles.
            </p>
          </div>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {images.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
                <img
                  src={src}
                  alt={`Work ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-background/90 text-destructive opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}