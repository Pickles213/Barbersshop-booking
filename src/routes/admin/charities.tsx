import { createFileRoute } from "@tanstack/react-router";

import { CharitiesPage } from "@/components/admin/charities-page";

export const Route = createFileRoute("/admin/charities")({
  head: () => ({
    meta: [
      { title: "Charities · Admin" },
      { name: "description", content: "Manage charity entries displayed on the About Us page." },
    ],
  }),
  component: CharitiesPage,
});
