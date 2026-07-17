import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Scissors, Tag, CreditCard, Receipt, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId?: string | null;
  walkInId?: string | null;
  customerName: string;
  basePrice: number;
  barberId: string | null;
  onSuccess: () => void;
}

export function CheckoutDialog({
  isOpen,
  onOpenChange,
  bookingId,
  walkInId,
  customerName,
  basePrice,
  barberId,
  onSuccess,
}: CheckoutDialogProps) {
  const qc = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "maya" | "card">("cash");
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState<any>(null);
  const [discountError, setDiscountError] = useState("");
  const [notes, setNotes] = useState("");

  // Manual override states
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<"code" | "manual">("code");

  // 1. Fetch active discounts
  const { data: discounts = [] } = useQuery({
    queryKey: ["active-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discounts")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // 2. Fetch barber's commission rate if barberId is set
  const { data: barber } = useQuery({
    queryKey: ["barber-commission-rate", barberId],
    queryFn: async () => {
      if (!barberId) return null;
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name, commission_rate")
        .eq("id", barberId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!barberId,
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod("cash");
      setDiscountCode("");
      setDiscountApplied(null);
      setDiscountError("");
      setNotes("");
      setManualDiscount(0);
      setDiscountMode("code");
    }
  }, [isOpen]);

  // Handle applying discount code
  const handleApplyCode = () => {
    setDiscountError("");
    const matched = discounts.find(
      (d) => d.code.toUpperCase() === discountCode.trim().toUpperCase()
    );

    if (!matched) {
      setDiscountError("Invalid or inactive discount code");
      setDiscountApplied(null);
      return;
    }

    // Check expiry
    if (matched.expiry_date && new Date(matched.expiry_date) < new Date()) {
      setDiscountError("This discount code has expired");
      setDiscountApplied(null);
      return;
    }

    setDiscountApplied(matched);
    toast.success(`Discount "${matched.code}" applied!`);
  };

  // Calculate final amount
  const calculateFinalAmount = () => {
    let final = basePrice;
    if (discountMode === "code" && discountApplied) {
      if (discountApplied.discount_type === "percent") {
        final = basePrice * (1 - discountApplied.value / 100);
      } else {
        final = basePrice - discountApplied.value;
      }
    } else if (discountMode === "manual" && manualDiscount > 0) {
      final = basePrice - manualDiscount;
    }
    return Math.max(0, final);
  };

  const finalAmount = calculateFinalAmount();
  const totalDiscountAmount = basePrice - finalAmount;

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      // 1. Calculate barber commission if barberId is set
      const commRate = barber?.commission_rate ?? 50; // defaults to 50%
      const commAmount = (finalAmount * commRate) / 100;

      // 2. Insert Payment record
      const paymentPayload: any = {
        amount: finalAmount,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
        discount_id: discountMode === "code" && discountApplied ? discountApplied.id : null,
      };
      if (bookingId) paymentPayload.booking_id = bookingId;
      if (walkInId) paymentPayload.walk_in_id = walkInId;

      const { data: payment, error: payError } = await supabase
        .from("payments")
        .insert(paymentPayload)
        .select()
        .single();
      if (payError) throw payError;

      // 3. Insert Commission record if barber is assigned
      if (barberId) {
        const commPayload: any = {
          barber_id: barberId,
          gross_amount: finalAmount,
          commission_rate: commRate,
          commission_amount: commAmount,
        };
        if (bookingId) commPayload.booking_id = bookingId;
        if (walkInId) commPayload.walk_in_id = walkInId;

        const { error: commError } = await supabase
          .from("barber_commissions")
          .insert(commPayload);
        if (commError) throw commError;
      }

      // 4. Update Booking or Walk-in status to completed
      if (bookingId) {
        const { error: bError } = await supabase
          .from("bookings")
          .update({ status: "completed" })
          .eq("id", bookingId);
        if (bError) throw bError;
      } else if (walkInId) {
        const { error: wError } = await supabase
          .from("walk_ins")
          .update({ status: "completed", served_at: new Date().toISOString() })
          .eq("id", walkInId);
        if (wError) throw wError;
      }
    },
    onSuccess: () => {
      toast.success("Checkout completed successfully!");
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to complete checkout");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-zinc-950 text-black dark:text-white p-0 overflow-hidden border-2 border-black dark:border-zinc-800 rounded-3xl">
        <div className="bg-black text-white dark:bg-zinc-900 dark:text-zinc-100 p-6 flex items-center gap-2 border-b-2 border-black dark:border-zinc-800">
          <Receipt className="h-5 w-5" />
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest">POS Checkout &amp; Billing</h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer & Barber Summary */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-xs">
            <div>
              <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">Customer</span>
              <p className="font-bold uppercase">{customerName}</p>
            </div>
            <div>
              <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">Barber / Commission Rate</span>
              <p className="font-bold uppercase text-amber-600 dark:text-amber-400">
                {barber ? `${barber.name} (${barber.commission_rate}%)` : "No Barber Assigned"}
              </p>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <Label className="font-mono text-xs font-bold uppercase text-zinc-400">Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(val: any) => setPaymentMethod(val)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { id: "cash", label: "Cash" },
                { id: "gcash", label: "GCash" },
                { id: "maya", label: "Maya" },
                { id: "card", label: "Card / Terminal" },
              ].map((method) => (
                <Label
                  key={method.id}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === method.id
                      ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-900 font-bold"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                  <CreditCard className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs uppercase font-mono tracking-wider">{method.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Discount Section */}
          <div className="space-y-2.5 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="flex justify-between items-center">
              <Label className="font-mono text-xs font-bold uppercase text-zinc-400">Discounts</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountMode("code")}
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border ${
                    discountMode === "code"
                      ? "bg-black text-white dark:bg-white dark:text-black font-bold"
                      : "text-zinc-500 border-zinc-200"
                  }`}
                >
                  Promo Code
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode("manual")}
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border ${
                    discountMode === "manual"
                      ? "bg-black text-white dark:bg-white dark:text-black font-bold"
                      : "text-zinc-500 border-zinc-200"
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            {discountMode === "code" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-450" />
                    <Input
                      placeholder="ENTER PROMO CODE"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      className="pl-9 font-mono text-xs placeholder:tracking-normal tracking-wider"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCode}
                    className="text-xs font-mono uppercase shrink-0"
                  >
                    Apply
                  </Button>
                </div>
                {discountError && <p className="text-[10px] font-bold text-red-500 uppercase">{discountError}</p>}
                {discountApplied && (
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Applied: {discountApplied.code} (-
                    {discountApplied.discount_type === "percent"
                      ? `${discountApplied.value}%`
                      : `₱${discountApplied.value}`}
                    )
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Label className="text-xs shrink-0">Discount Amount (₱)</Label>
                <Input
                  type="number"
                  min="0"
                  max={basePrice}
                  value={manualDiscount || ""}
                  onChange={(e) => setManualDiscount(Math.min(basePrice, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="font-mono text-xs"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <Label className="font-mono text-xs font-bold uppercase text-zinc-400">Notes (Optional)</Label>
            <Textarea
              placeholder="Add POS or billing comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs rounded-xl"
            />
          </div>

          {/* Price Breakdown & Checkout Button */}
          <div className="border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Subtotal</span>
              <span className="font-mono">₱{basePrice.toLocaleString()}</span>
            </div>
            {totalDiscountAmount > 0 && (
              <div className="flex justify-between text-xs text-red-500 font-bold">
                <span>Discount</span>
                <span className="font-mono">-₱{totalDiscountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest">Amount Due</span>
              <span className="font-mono text-2xl font-black text-black dark:text-white">
                ₱{finalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-zinc-50 dark:bg-zinc-900/30 p-4 border-t border-zinc-150 dark:border-zinc-800 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full font-mono text-xs uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            disabled={checkoutMutation.isPending}
            onClick={() => checkoutMutation.mutate()}
            className="rounded-full bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest px-8"
          >
            {checkoutMutation.isPending ? (
              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing</span>
            ) : (
              "Complete Checkout"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
