import { createFileRoute } from "@tanstack/react-router";

import { AuditLogsPage } from "@/components/admin/audit-logs-page";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs · Admin" },
      { name: "description", content: "Immutable history of every change made in the system." },
    ],
  }),
  component: AuditLogsPage,
});