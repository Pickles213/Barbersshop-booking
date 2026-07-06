import { createFileRoute } from "@tanstack/react-router";

import { SchedulesPage } from "@/components/admin/schedules-page";

export const Route = createFileRoute("/admin/schedules")({
  head: () => ({
    meta: [
      { title: "Schedules · Admin" },
      { name: "description", content: "Connect Supabase to manage weekly schedules, breaks and time off." },
    ],
  }),
  component: SchedulesPage,
});
