import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/admin/services")({
  head: () => ({
    meta: [
      { title: "Services · Admin" },
      { name: "description", content: "Connect Supabase to load, create and edit services with pricing and duration." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Services"
      subtitle="Manage your service catalog"
      description="Connect Supabase to load, create and edit services with pricing and duration."
    />
  ),
});
