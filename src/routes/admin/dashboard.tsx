import { createFileRoute } from "@tanstack/react-router";

import { DashboardHeader } from "@/components/admin/dashboard-header";
import { StatsGrid } from "@/components/admin/stats-grid";
import { UpcomingBookingsTable } from "@/components/admin/upcoming-bookings-table";
import { RecentBookingsTable } from "@/components/admin/recent-bookings-table";
import { RevenueSummary } from "@/components/admin/revenue-summary";
import { BarberPerformance } from "@/components/admin/barber-performance";
import { mockRecent, mockStats, mockUpcoming } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard · Sharp & Co." },
      { name: "description", content: "Overview of bookings, revenue and barber performance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dashboard"
        subtitle="Welcome back — here's what's happening today."
      />
      <StatsGrid stats={mockStats} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueSummary />
        </div>
        <BarberPerformance />
      </div>
      <UpcomingBookingsTable rows={mockUpcoming} />
      <RecentBookingsTable rows={mockRecent} />
    </div>
  );
}