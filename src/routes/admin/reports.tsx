import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Admin" },
      { name: "description", content: "Connect Supabase to surface revenue, retention and barber performance reports." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Reports"
      subtitle="Business analytics"
      description="Connect Supabase to surface revenue, retention and barber performance reports."
    />
  ),
});
