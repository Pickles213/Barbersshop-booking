import { createFileRoute } from "@tanstack/react-router";

import { RolesPage } from "@/components/admin/roles-page";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles · Admin" },
      {
        name: "description",
        content: "Manage system and custom roles, permissions and assignments.",
      },
    ],
  }),
  component: RolesPage,
});
