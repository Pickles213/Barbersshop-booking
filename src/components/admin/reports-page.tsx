import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardHeader } from "./dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPHP, mockBarberPerformance } from "@/lib/mock-data";

const revenueByService = [
  { service: "Classic Fade", revenue: 82800 },
  { service: "Skin Fade", revenue: 71000 },
  { service: "Combo", revenue: 72000 },
  { service: "Beard Trim", revenue: 30250 },
  { service: "Hot Towel", revenue: 52800 },
  { service: "Kids Cut", revenue: 19200 },
];

const bookingsByStatus = [
  { name: "Completed", value: 412, color: "var(--color-primary)" },
  { name: "Confirmed", value: 98, color: "#10b981" },
  { name: "Pending", value: 44, color: "#f59e0b" },
  { name: "Cancelled", value: 22, color: "#ef4444" },
  { name: "No-show", value: 11, color: "#94a3b8" },
];

const monthlyTrend = [
  { month: "Jan", bookings: 412, revenue: 168000 },
  { month: "Feb", bookings: 398, revenue: 161200 },
  { month: "Mar", bookings: 467, revenue: 192300 },
  { month: "Apr", bookings: 521, revenue: 211500 },
  { month: "May", bookings: 548, revenue: 226400 },
  { month: "Jun", bookings: 587, revenue: 184250 },
];

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
};

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader title="Reports" subtitle="Business analytics and performance" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByService} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="service" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPHP(v)} />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bookings by Status</CardTitle>
            <CardDescription>Distribution this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bookingsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={92} paddingAngle={2}>
                    {bookingsByStatus.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
          <CardDescription>Bookings and revenue over 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis yAxisId="left" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="var(--color-primary)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Barber Performance</CardTitle>
          <CardDescription>Bookings handled this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockBarberPerformance} layout="vertical" margin={{ top: 8, right: 8, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis dataKey="barber_name" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="bookings_count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}