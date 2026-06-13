import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/admin/barbers")({
  head: () => ({
    meta: [
      { title: "Barbers · Admin" },
      { name: "description", content: "Connect Supabase to load barber profiles, specializations and availability." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Barbers"
      subtitle="Manage your barber team"
      description="Connect Supabase to load barber profiles, specializations and availability."
    />
  ),
});
