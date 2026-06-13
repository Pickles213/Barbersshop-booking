import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/admin/schedules")({
  head: () => ({
    meta: [
      { title: "Schedules · Admin" },
      { name: "description", content: "Connect Supabase to manage weekly schedules, breaks and time off." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Schedules"
      subtitle="Working hours and unavailability"
      description="Connect Supabase to manage weekly schedules, breaks and time off."
    />
  ),
});
