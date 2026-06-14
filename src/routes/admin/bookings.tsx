import { createFileRoute } from "@tanstack/react-router";

import { BookingsPage } from "@/components/admin/bookings-page";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings · Admin" },
      { name: "description", content: "Connect Supabase to browse and manage every booking with filters and search." },
    ],
  }),
  component: BookingsPage,
});
