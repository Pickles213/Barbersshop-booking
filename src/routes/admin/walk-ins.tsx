import { createFileRoute } from "@tanstack/react-router";

import { WalkInsPage } from "@/components/admin/walk-ins-page";

export const Route = createFileRoute("/admin/walk-ins")({
  head: () => ({
    meta: [
      { title: "Walk-ins · Admin" },
      { name: "description", content: "Connect Supabase to capture walk-in customers and assign barbers in real time." },
    ],
  }),
  component: WalkInsPage,
});
