import { createFileRoute } from "@tanstack/react-router";

import { ReportsPage } from "@/components/admin/reports-page";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Admin" },
      { name: "description", content: "Connect Supabase to surface revenue, retention and barber performance reports." },
    ],
  }),
  component: ReportsPage,
});
