import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/admin/walk-ins")({
  head: () => ({
    meta: [
      { title: "Walk-ins · Admin" },
      { name: "description", content: "Connect Supabase to capture walk-in customers and assign barbers in real time." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Walk-ins"
      subtitle="Walk-in queue"
      description="Connect Supabase to capture walk-in customers and assign barbers in real time."
    />
  ),
});
