import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Admin" },
      { name: "description", content: "Connect Supabase to view notifications, email logs and audit history." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Notifications"
      subtitle="System alerts"
      description="Connect Supabase to view notifications, email logs and audit history."
    />
  ),
});
