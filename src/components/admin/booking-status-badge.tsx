import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/db";

const styles: Record<BookingStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  confirmed: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  in_progress: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  no_show: "bg-muted text-muted-foreground border-border",
};

const labels: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {labels[status]}
    </Badge>
  );
}