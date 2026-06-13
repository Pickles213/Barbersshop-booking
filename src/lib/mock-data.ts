import type {
  BarberPerformanceRow,
  DashboardStats,
  UpcomingBookingRow,
} from "@/types/db";

export const mockStats: DashboardStats = {
  todayBookings: 24,
  weeklyBookings: 142,
  monthlyBookings: 587,
  totalCustomers: 1284,
  totalRevenue: 184250,
  mostRequestedService: "Classic Fade",
  mostRequestedBarber: "Marco Reyes",
  cancelledAppointments: 12,
  noShowAppointments: 6,
};

export const mockUpcoming: UpcomingBookingRow[] = [
  {
    id: "u1",
    booking_reference: "BK-10421",
    client_name: "Daniel Cruz",
    service_name: "Classic Fade",
    barber_name: "Marco Reyes",
    appointment_date: "2026-06-13",
    start_time: "10:00",
    status: "confirmed",
    price: 450,
  },
  {
    id: "u2",
    booking_reference: "BK-10422",
    client_name: "Anton Lim",
    service_name: "Beard Trim",
    barber_name: "Jules Santos",
    appointment_date: "2026-06-13",
    start_time: "10:30",
    status: "pending",
    price: 250,
  },
  {
    id: "u3",
    booking_reference: "BK-10423",
    client_name: "Rafael Tan",
    service_name: "Hot Towel Shave",
    barber_name: "Eli Mendoza",
    appointment_date: "2026-06-13",
    start_time: "11:15",
    status: "in_progress",
    price: 600,
  },
  {
    id: "u4",
    booking_reference: "BK-10424",
    client_name: "Miguel Reyes",
    service_name: "Hair + Beard Combo",
    barber_name: "Marco Reyes",
    appointment_date: "2026-06-13",
    start_time: "12:00",
    status: "confirmed",
    price: 750,
  },
  {
    id: "u5",
    booking_reference: "BK-10425",
    client_name: "Jacob Uy",
    service_name: "Kids Cut",
    barber_name: "Jules Santos",
    appointment_date: "2026-06-13",
    start_time: "13:00",
    status: "confirmed",
    price: 300,
  },
];

export const mockRecent: UpcomingBookingRow[] = [
  {
    id: "r1",
    booking_reference: "BK-10418",
    client_name: "Paolo Garcia",
    service_name: "Classic Fade",
    barber_name: "Marco Reyes",
    appointment_date: "2026-06-12",
    start_time: "16:30",
    status: "completed",
    price: 450,
  },
  {
    id: "r2",
    booking_reference: "BK-10417",
    client_name: "Vince Aquino",
    service_name: "Beard Trim",
    barber_name: "Eli Mendoza",
    appointment_date: "2026-06-12",
    start_time: "15:00",
    status: "completed",
    price: 250,
  },
  {
    id: "r3",
    booking_reference: "BK-10416",
    client_name: "Leo Bautista",
    service_name: "Hair + Beard Combo",
    barber_name: "Jules Santos",
    appointment_date: "2026-06-12",
    start_time: "14:00",
    status: "cancelled",
    price: 750,
  },
  {
    id: "r4",
    booking_reference: "BK-10415",
    client_name: "Niko Flores",
    service_name: "Hot Towel Shave",
    barber_name: "Marco Reyes",
    appointment_date: "2026-06-12",
    start_time: "11:00",
    status: "no_show",
    price: 600,
  },
];

export const mockBarberPerformance: BarberPerformanceRow[] = [
  { barber_id: "b1", barber_name: "Marco Reyes", bookings_count: 184, revenue: 78420, rating: 4.9 },
  { barber_id: "b2", barber_name: "Jules Santos", bookings_count: 152, revenue: 61200, rating: 4.8 },
  { barber_id: "b3", barber_name: "Eli Mendoza", bookings_count: 121, revenue: 44630, rating: 4.7 },
  { barber_id: "b4", barber_name: "Sam Villar", bookings_count: 96, revenue: 32100, rating: 4.6 },
];

export const mockRevenueSeries = [
  { day: "Mon", revenue: 21400 },
  { day: "Tue", revenue: 18900 },
  { day: "Wed", revenue: 24500 },
  { day: "Thu", revenue: 27200 },
  { day: "Fri", revenue: 32100 },
  { day: "Sat", revenue: 41800 },
  { day: "Sun", revenue: 18350 },
];

export function formatPHP(n: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}