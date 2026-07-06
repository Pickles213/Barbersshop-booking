// Database schema types — mirror future Supabase tables.
// Swap mock data for `supabase.from('<table>').select()` later without refactoring callers.

export type UserRole = "customer" | "barber" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Barber {
  id: string;
  profile_id: string;
  specialization: string;
  experience_years: number;
  bio: string;
  photo_url: string | null;
  is_active: boolean;
}

export interface BarberSchedule {
  id: string;
  barber_id: string;
  day_of_week: number; // 0–6
  start_time: string; // HH:mm
  end_time: string;
}

export interface BarberBreak {
  id: string;
  barber_id: string;
  start_time: string;
  end_time: string;
}

export interface BarberUnavailability {
  id: string;
  barber_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export type BookingType = "individual" | "group" | "walk_in";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Booking {
  id: string;
  booking_reference: string;
  customer_id: string;
  booking_type: BookingType;
  status: BookingStatus;
  total_price: number;
  notes: string | null;
  created_at: string;
}

export interface BookingClient {
  id: string;
  booking_id: string;
  client_name: string;
  service_id: string;
  barber_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  price: number;
}

export interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  sent_at: string;
}

export type PaymentMethod = "cash" | "gcash" | "paymaya" | "card";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_reference: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

// View models used by dashboard widgets (joined shape).
export interface UpcomingBookingRow {
  id: string;
  booking_reference: string;
  client_name: string;
  service_name: string;
  barber_name: string;
  appointment_date: string;
  start_time: string;
  status: BookingStatus;
  price: number;
}

export interface BarberPerformanceRow {
  barber_id: string;
  barber_name: string;
  bookings_count: number;
  revenue: number;
  rating: number;
}

export interface DashboardStats {
  todayBookings: number;
  weeklyBookings: number;
  monthlyBookings: number;
  totalCustomers: number;
  totalRevenue: number;
  mostRequestedService: string;
  mostRequestedBarber: string;
  cancelledAppointments: number;
  noShowAppointments: number;
}