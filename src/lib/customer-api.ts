import { supabase } from "@/integrations/supabase/client";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  duration_minutes: number;
};

export type CharityEntry = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  event_date: string | null;
  sort_order: number;
  location: string | null;
};

export type Barber = {
  id: string;
  name: string;
  specialization: string | null;
  experience_years: number | null;
  bio: string | null;
  rating: number | null;
  avatar_url: string | null;
};

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("id,name,description,category,price,duration_minutes")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("price", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function fetchBarbers(): Promise<Barber[]> {
  const { data, error } = await supabase
    .from("barbers")
    .select("id,name,specialization,experience_years,bio,rating,avatar_url")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  // Use the trigger-maintained `barbers.rating` column (global average).
  // Recomputing on the client is unsafe under RLS: embedded joins to `bookings`
  // only return rows owned by the current user, which would personalize the rating.
  return (data ?? []) as Barber[];
}

export async function fetchBarberPortfolio(barberId: string) {
  const { data, error } = await supabase
    .from("barber_portfolio")
    .select("id,image_url,caption")
    .eq("barber_id", barberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchShopSettings() {
  const { data, error } = await supabase
    .from("shop_settings")
    .select("*")
    .order("id")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchAvailableSlots(
  barberId: string,
  date: string,
  durationMinutes: number,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_barber_id: barberId,
    p_date: date,
    p_duration_minutes: durationMinutes,
  });
  if (error) throw error;
  // RPC returns array of time strings like "09:00:00"
  return ((data ?? []) as string[]).map((t) => t.slice(0, 5));
}

export async function createBooking(payload: {
  service_ids: string[];
  barber_id: string | null;
  booking_date: string;
  start_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  notes?: string;
}) {
  const { data, error } = await (supabase as any).rpc("public_booking_create", {
    p_service_ids: payload.service_ids,
    p_barber_id: payload.barber_id,
    p_booking_date: payload.booking_date,
    p_start_time: payload.start_time,
    p_customer_name: payload.customer_name,
    p_customer_phone: payload.customer_phone,
    p_customer_email: payload.customer_email ?? "",
    p_notes: payload.notes ?? null,
  });
  if (error) throw error;
  return data as {
    id: string;
    reference: string;
    barber_id: string;
    booking_date: string;
    start_time: string;
    price: number;
    status: string;
  };
}

export type BookingServiceLine = {
  id: string;
  service_id: string | null;
  service_name: string;
  price: number;
  duration_minutes: number;
};

export async function fetchBookingServices(bookingId: string): Promise<BookingServiceLine[]> {
  const { data, error } = await (supabase as any)
    .from("booking_services")
    .select("id,service_id,service_name,price,duration_minutes")
    .eq("booking_id", bookingId);
  if (error) throw error;
  return (data ?? []) as BookingServiceLine[];
}

export type MyBooking = {
  id: string;
  reference: string;
  booking_date: string;
  start_time: string;
  status: string;
  price: number;
  notes: string | null;
  barber_id: string | null;
  service_id: string | null;
  created_at: string;
  booking_services: BookingServiceLine[];
};

export async function fetchMyBookings(userId: string): Promise<MyBooking[]> {
  const { data, error } = await (supabase as any)
    .from("bookings")
    .select(
      "id,reference,booking_date,start_time,status,price,notes,barber_id,service_id,created_at,booking_services(id,service_id,service_name,price,duration_minutes)",
    )
    .eq("user_id", userId)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MyBooking[];
}

export async function cancelMyBooking(id: string) {
  const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}

export async function fetchCharities(): Promise<CharityEntry[]> {
  const { data, error } = await supabase
    .from("charities")
    .select("id,title,description,video_url,event_date,sort_order,location")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("event_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CharityEntry[];
}
