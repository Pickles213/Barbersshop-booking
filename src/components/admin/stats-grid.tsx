import {
  Ban,
  CalendarDays,
  CalendarRange,
  CalendarCheck2,
  Scissors,
  Star,
  UserRound,
  UserX,
  Wallet,
} from "lucide-react";

import type { DashboardStats } from "@/types/db";
import { formatPHP } from "@/lib/mock-data";

import { StatCard } from "./stat-card";

interface StatsGridProps {
  stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <StatCard
        label="Today's Bookings"
        value={stats.todayBookings}
        icon={CalendarCheck2}
        accent="primary"
        trend={{ value: "+8% vs yesterday", positive: true }}
      />
      <StatCard
        label="Weekly Bookings"
        value={stats.weeklyBookings}
        icon={CalendarDays}
        accent="sky"
        trend={{ value: "+12% vs last week", positive: true }}
      />
      <StatCard
        label="Monthly Bookings"
        value={stats.monthlyBookings}
        icon={CalendarRange}
        accent="violet"
      />
      <StatCard
        label="Total Customers"
        value={stats.totalCustomers.toLocaleString()}
        icon={UserRound}
        accent="emerald"
      />
      <StatCard
        label="Total Revenue"
        value={formatPHP(stats.totalRevenue)}
        icon={Wallet}
        accent="emerald"
        trend={{ value: "+18% MoM", positive: true }}
      />
      <StatCard
        label="Most Requested Service"
        value={stats.mostRequestedService}
        hint="Top performer this month"
        icon={Scissors}
        accent="primary"
      />
      <StatCard
        label="Most Requested Barber"
        value={stats.mostRequestedBarber}
        hint="Top performer this month"
        icon={Star}
        accent="amber"
      />
      <StatCard
        label="Cancelled"
        value={stats.cancelledAppointments}
        hint={`${stats.noShowAppointments} no-shows`}
        icon={Ban}
        accent="rose"
      />
    </div>
  );
}

// Re-export for variety in icon usage
export { UserX };