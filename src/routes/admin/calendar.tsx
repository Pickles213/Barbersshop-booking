import { createFileRoute } from "@tanstack/react-router";

import { CalendarPage } from "@/components/admin/calendar-page";

export const Route = createFileRoute("/admin/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar · Admin" },
      {
        name: "description",
        content: "Visual drag-and-drop bookings schedule board.",
      },
    ],
  }),
  component: CalendarPage,
});
