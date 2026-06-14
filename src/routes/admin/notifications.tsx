import { createFileRoute } from "@tanstack/react-router";

import { NotificationsPage } from "@/components/admin/notifications-page";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Admin" },
      { name: "description", content: "Connect Supabase to view notifications, email logs and audit history." },
    ],
  }),
  component: NotificationsPage,
});
