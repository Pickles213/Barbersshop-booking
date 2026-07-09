-- Create security definer function to query barber bookings count and clients count securely
CREATE OR REPLACE FUNCTION public.get_barber_stats(p_barber_id uuid)
RETURNS TABLE (
  appointments_completed bigint,
  clients_served bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(id) AS appointments_completed,
    COALESCE(COUNT(DISTINCT COALESCE(customer_phone, customer_name, user_id::text)), 0) AS clients_served
  FROM public.bookings
  WHERE barber_id = p_barber_id AND status = 'completed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_barber_stats(uuid) TO anon, authenticated;

-- Create security definer function to query reviews for a specific barber safely
CREATE OR REPLACE FUNCTION public.get_barber_reviews(p_barber_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  rating integer,
  comment text,
  customer_name text,
  service_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.created_at,
    r.rating,
    r.comment,
    r.customer_name,
    r.service_name
  FROM public.reviews r
  JOIN public.bookings b ON b.id = r.booking_id
  WHERE b.barber_id = p_barber_id
  ORDER BY r.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_barber_reviews(uuid) TO anon, authenticated;
