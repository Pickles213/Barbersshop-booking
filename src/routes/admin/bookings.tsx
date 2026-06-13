import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings · Admin" },
      { name: "description", content: "Connect Supabase to browse and manage every booking with filters and search." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Bookings"
      subtitle="All appointments"
      description="Connect Supabase to browse and manage every booking with filters and search."
    />
  ),
});
