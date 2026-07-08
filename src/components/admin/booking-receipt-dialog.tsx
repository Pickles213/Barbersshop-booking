import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { BookingStatusBadge } from "./booking-status-badge";
import { formatTime } from "@/lib/utils";
import { Receipt, Calendar, Clock, User, Phone, Mail, Scissors, FileText } from "lucide-react";

interface BookingReceiptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
}

export function BookingReceiptDialog({ isOpen, onOpenChange, booking }: BookingReceiptDialogProps) {
  if (!booking) return null;

  // Format date: e.g. "Wednesday, July 8, 2026"
  const formattedDate = booking.booking_date 
    ? new Date(booking.booking_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC"
      })
    : "—";

  const servicesList = booking.booking_services && booking.booking_services.length > 0
    ? booking.booking_services
    : booking.service
      ? [{ service_name: booking.service.name, price: booking.price, duration_minutes: 0 }]
      : [];

  const totalDuration = booking.booking_services && booking.booking_services.length > 0
    ? booking.booking_services.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-zinc-950 text-black dark:text-white p-0 overflow-hidden border-2 border-black dark:border-zinc-800">
        <div className="bg-black text-white dark:bg-zinc-900 dark:text-zinc-100 p-6 flex items-center justify-between border-b-2 border-black dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest">Booking Receipt</h2>
          </div>
          <span className="font-mono text-xs bg-zinc-850 text-zinc-300 dark:bg-zinc-800 px-2 py-0.5 rounded font-bold">
            {booking.reference}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer & Status Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Customer Info</span>
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-1.5">
                <User className="h-4 w-4 text-zinc-400 shrink-0" />
                {booking.customer_name}
              </h3>
              {(booking.customer_phone || booking.customer_email) && (
                <div className="space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {booking.customer_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{booking.customer_phone}</span>
                    </div>
                  )}
                  {booking.customer_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span>{booking.customer_email}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Status</span>
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                <Calendar className="h-3 w-3 text-zinc-400 shrink-0" />
                Date
              </div>
              <p className="text-xs font-bold uppercase">{formattedDate}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                Time slot
              </div>
              <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                {formatTime(booking.start_time?.slice(0, 5))}
                {totalDuration > 0 && <span className="text-[10px] text-zinc-400 font-normal ml-1">({totalDuration} min)</span>}
              </p>
            </div>
          </div>

          {/* Service breakdown */}
          <div className="space-y-3">
            <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Services & Breakdown</span>
            <div className="space-y-2.5">
              {servicesList.map((s: any, idx: number) => (
                <div key={idx} className="flex justify-between items-baseline gap-4 text-sm">
                  <span className="font-bold uppercase tracking-tight flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    {s.service_name || s.name}
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-600 dark:text-zinc-400 shrink-0">
                    ₱{Number(s.price).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Barber */}
          <div className="flex justify-between items-baseline text-sm bg-zinc-50 dark:bg-zinc-900/30 p-2 px-3 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
            <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">Assigned Barber</span>
            <span className="font-bold uppercase text-black dark:text-white">
              {booking.barber?.name ?? "ANY AVAILABLE BARBER"}
            </span>
          </div>

          {/* Notes if any */}
          {booking.notes && (
            <div className="space-y-1 bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-lg border border-amber-200/50 dark:border-amber-900/30 text-xs">
              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                <FileText className="h-3.5 w-3.5" /> Notes
              </span>
              <p className="text-zinc-600 dark:text-zinc-400 italic">"{booking.notes}"</p>
            </div>
          )}

          {/* Receipt Total */}
          <div className="border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 pt-4 flex justify-between items-baseline">
            <span className="font-mono text-xs font-bold uppercase tracking-widest">Total Price</span>
            <span className="font-mono text-2xl font-black text-black dark:text-white">
              ₱{Number(booking.price).toLocaleString()}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
