import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Admin" },
      { name: "description", content: "Connect Supabase to manage shop info, payment methods, holidays and admin users." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Settings"
      subtitle="Shop preferences"
      description="Connect Supabase to manage shop info, payment methods, holidays and admin users."
    />
  ),
});
