import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "@/components/admin/settings-page";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Admin" },
      { name: "description", content: "Connect Supabase to manage shop info, payment methods, holidays and admin users." },
    ],
  }),
  component: SettingsPage,
});
