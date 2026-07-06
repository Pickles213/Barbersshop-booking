import { createFileRoute } from "@tanstack/react-router";

import { BarbersPage } from "@/components/admin/barbers-page";

export const Route = createFileRoute("/admin/barbers")({
  head: () => ({
    meta: [
      { title: "Barbers · Admin" },
      {
        name: "description",
        content:
          "Manage your barber team, profiles, specializations and showcase portfolio of their work.",
      },
    ],
  }),
  component: BarbersPage,
});
