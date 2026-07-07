import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export function SiteLayout({ children }: { children: ReactNode }) {
  const [pendingReview, setPendingReview] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [open, setOpen] = useState(false);

  // Mutation to submit the customer's review
  const submitReview = useMutation({
    mutationFn: async (payload: {
      booking_id: string | null;
      customer_name: string;
      service_name: string;
      rating: number;
      comment: string;
    }) => {
      const { error } = await supabase.from("reviews").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thank you for your review!");
      setOpen(false);
      setPendingReview(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit review");
    },
  });

  const checkPendingReviews = async (userId: string) => {
    // If the user has already dismissed the review prompt during this browser session, don't show it again
    if (sessionStorage.getItem("dismissed_review_prompt") === "true") {
      return;
    }

    try {
      // Get all completed bookings for this user with barber and service details
      const { data: completed } = await supabase
        .from("bookings")
        .select("id, customer_name, barber_id, barber:barbers(name), service:services(name)")
        .eq("user_id", userId)
        .eq("status", "completed");

      if (!completed || completed.length === 0) return;

      // Get reviewed booking IDs
      const { data: reviewed } = await supabase
        .from("reviews")
        .select("booking_id")
        .not("booking_id", "is", null);

      const reviewedIds = new Set(reviewed?.map((r: any) => r.booking_id) ?? []);

      // Find the first completed booking that has NOT been reviewed yet
      const pending = completed.find((b: any) => !reviewedIds.has(b.id));
      if (pending) {
        setPendingReview({
          id: pending.id,
          customer_name: pending.customer_name,
          service_name: pending.service?.name || "Service",
          barber_id: pending.barber_id,
          barber_name: pending.barber?.name || null,
        });
        setReviewRating(5);
        setReviewComment("");
        setOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let bookingsChannel: any = null;
    let walkinsChannel: any = null;

    // Get current logged in user and start listening
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // 1. Initial check for any unreviewed completed appointments on mount
      checkPendingReviews(user.id);

      // 2. Realtime listener for completed bookings
      bookingsChannel = supabase
        .channel(`customer_bookings_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
          },
          async (payload: any) => {
            if (
              payload.new.status === "completed" &&
              payload.old.status !== "completed" &&
              payload.new.user_id === user.id
            ) {
              // Fetch service name and barber name
              const { data: bData } = await supabase
                .from("bookings")
                .select("*, service:services(name), barber:barbers(name)")
                .eq("id", payload.new.id)
                .single();
              
              setPendingReview({
                id: payload.new.id,
                customer_name: payload.new.customer_name,
                service_name: bData?.service?.name || "Service",
                barber_id: payload.new.barber_id,
                barber_name: bData?.barber?.name || null,
              });
              setReviewRating(5);
              setReviewComment("");
              setOpen(true);
            }
          }
        )
        .subscribe();

      // 3. Realtime listener for completed walk-ins
      walkinsChannel = supabase
        .channel(`customer_walkins_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "walk_ins",
          },
          async (payload: any) => {
            if (
              payload.new.status === "completed" &&
              payload.old.status !== "completed" &&
              payload.new.user_id === user.id
            ) {
              // Fetch service name and barber name
              const { data: wData } = await supabase
                .from("walk_ins")
                .select("*, service:services(name), barber:barbers(name)")
                .eq("id", payload.new.id)
                .single();

              setPendingReview({
                id: null,
                customer_name: payload.new.customer_name,
                service_name: wData?.service?.name || "Service",
                barber_id: payload.new.barber_id,
                barber_name: wData?.barber?.name || null,
              });
              setReviewRating(5);
              setReviewComment("");
              setOpen(true);
            }
          }
        )
        .subscribe();
    });

    return () => {
      if (bookingsChannel) supabase.removeChannel(bookingsChannel);
      if (walkinsChannel) supabase.removeChannel(walkinsChannel);
    };
  }, []);

  const handleDismiss = () => {
    // Record in sessionStorage that the user dismissed the prompt for this session
    sessionStorage.setItem("dismissed_review_prompt", "true");
    setOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />

      {/* Global Customer Review Popup */}
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleDismiss();
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-2 border-black dark:border-white rounded-3xl p-6 animate-in fade-in zoom-in duration-200">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm font-black uppercase tracking-widest text-zinc-500">
              [ RATE YOUR EXPERIENCE ]
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <h3 className="text-xl font-bold uppercase tracking-tight text-black dark:text-white">
              How was your service?
            </h3>
            <p className="text-sm text-zinc-650 dark:text-zinc-400 font-light leading-relaxed">
              Hi <strong>{pendingReview?.customer_name}</strong>, please rate your recent <strong>{pendingReview?.service_name}</strong> {pendingReview?.barber_name ? <>with <strong>{pendingReview.barber_name}</strong></> : ""}. Your feedback is displayed live on our homepage.
            </p>
            
            <div className="space-y-2">
              <Label className="font-mono text-xs font-bold uppercase text-zinc-400">Rating</Label>
              <div className="flex gap-1 justify-center my-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setReviewRating(num)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        num <= reviewRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-200 dark:text-zinc-800"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs font-bold uppercase text-zinc-400">Comments</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your thoughts about your haircut or experience..."
                rows={3}
                className="rounded-xl border-zinc-300 dark:border-zinc-800 focus-visible:ring-black dark:focus-visible:ring-white bg-transparent"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="rounded-full font-mono text-xs uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Remind me later
            </Button>
            <Button
              disabled={submitReview.isPending}
              onClick={() => {
                submitReview.mutate({
                  booking_id: pendingReview?.id || null,
                  customer_name: pendingReview?.customer_name || "Customer",
                  service_name: pendingReview?.service_name || "Service",
                  rating: reviewRating,
                  comment: reviewComment,
                });
              }}
              className="rounded-full bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest px-6"
            >
              {submitReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}