-- ====================================================================================
-- Multi-service bookings
-- Lets a customer select several services in one appointment (one combined
-- time slot, one combined price) instead of being limited to a single service.
-- ====================================================================================

-- 1) Junction table: one row per service chosen within a booking.
--    Snapshots service_name/price/duration at booking time so historical
--    bookings stay accurate even if a service is later renamed/repriced/deleted.
CREATE TABLE IF NOT EXISTS public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON public.booking_services (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON public.booking_services (service_id);

GRANT SELECT ON public.booking_services TO authenticated;
GRANT ALL ON public.booking_services TO service_role;

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers read own booking services" ON public.booking_services;
CREATE POLICY "customers read own booking services"
  ON public.booking_services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_services.booking_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins manage booking services" ON public.booking_services;
CREATE POLICY "admins manage booking services"
  ON public.booking_services
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Replace public_booking_create so it accepts an array of service ids.
--    bookings.service_id is kept populated with the first selected service
--    (so any existing single-service admin views/reports keep working), while
--    price now reflects the combined total and booking_services holds the
--    full breakdown.
DROP FUNCTION IF EXISTS public.public_booking_create(uuid, uuid, date, time, text, text, text, text);

CREATE OR REPLACE FUNCTION public.public_booking_create(
  p_service_ids uuid[],
  p_barber_id uuid,
  p_booking_date date,
  p_start_time time,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_notes text DEFAULT NULL
) RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual_barber uuid := p_barber_id;
  v_barber public.barbers;
  v_slots time[];
  v_ref text;
  v_row public.bookings;
  v_total_duration integer := 0;
  v_total_price numeric(10,2) := 0;
  v_svc public.services;
  v_first_service_id uuid;
  v_valid_count integer;
BEGIN
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Select at least one service';
  END IF;

  IF length(coalesce(p_customer_name,'')) < 2 OR length(p_customer_name) > 100 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF length(coalesce(p_customer_phone,'')) < 5 OR length(p_customer_phone) > 30 THEN
    RAISE EXCEPTION 'Invalid phone';
  END IF;

  -- Validate every service id exists/active and accumulate totals.
  FOR v_svc IN
    SELECT * FROM public.services WHERE id = ANY(p_service_ids) AND is_active = true
  LOOP
    v_total_duration := v_total_duration + v_svc.duration_minutes;
    v_total_price := v_total_price + v_svc.price;
    IF v_first_service_id IS NULL THEN
      v_first_service_id := v_svc.id;
    END IF;
  END LOOP;

  IF v_first_service_id IS NULL THEN
    RAISE EXCEPTION 'Service not available';
  END IF;

  -- Guard against duplicate/inactive/unknown ids being silently dropped by the ANY() match above.
  SELECT count(DISTINCT id) INTO v_valid_count FROM public.services WHERE id = ANY(p_service_ids) AND is_active = true;
  IF v_valid_count <> (SELECT count(DISTINCT x) FROM unnest(p_service_ids) x) THEN
    RAISE EXCEPTION 'One or more selected services are not available';
  END IF;

  -- "Any available" if barber is null: pick first barber with a slot open for the combined duration.
  IF v_actual_barber IS NULL THEN
    SELECT b.id INTO v_actual_barber
    FROM public.barbers b
    WHERE b.is_active = true
      AND p_start_time = ANY(
        SELECT * FROM public.get_available_slots(b.id, p_booking_date, v_total_duration)
      )
    ORDER BY random()
    LIMIT 1;
    IF v_actual_barber IS NULL THEN RAISE EXCEPTION 'No barber available for that time'; END IF;
  ELSE
    SELECT * INTO v_barber FROM public.barbers WHERE id = v_actual_barber AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Barber not available'; END IF;
    SELECT array_agg(s) INTO v_slots FROM public.get_available_slots(v_actual_barber, p_booking_date, v_total_duration) s;
    IF v_slots IS NULL OR NOT (p_start_time = ANY(v_slots)) THEN
      RAISE EXCEPTION 'Selected time is no longer available';
    END IF;
  END IF;

  v_ref := 'BK-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO public.bookings (
    reference, customer_name, customer_phone, customer_email,
    barber_id, service_id, booking_date, start_time, status, price, notes, user_id
  ) VALUES (
    v_ref, p_customer_name, p_customer_phone, nullif(p_customer_email,''),
    v_actual_barber, v_first_service_id, p_booking_date, p_start_time, 'pending', v_total_price, p_notes, auth.uid()
  ) RETURNING * INTO v_row;

  INSERT INTO public.booking_services (booking_id, service_id, service_name, price, duration_minutes)
  SELECT v_row.id, s.id, s.name, s.price, s.duration_minutes
  FROM public.services s
  WHERE s.id = ANY(p_service_ids) AND s.is_active = true;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_booking_create(uuid[], uuid, date, time, text, text, text, text) TO anon, authenticated;
