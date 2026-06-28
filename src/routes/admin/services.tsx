import { createFileRoute } from "@tanstack/react-router";

import { ServicesPage } from "@/components/admin/services-page";

export const Route = createFileRoute("/admin/services")({
  head: () => ({
    meta: [
      { title: "Services · Admin" },
      { name: "description", content: "Connect Supabase to load, create and edit services with pricing and duration." },
    ],
  }),
  component: ServicesPage,
});
