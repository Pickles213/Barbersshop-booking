
-- 1) Add user_id to bookings (nullable for guests)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings(user_id);

-- 2) Public read access (anon + authenticated) for catalog tables
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.barbers TO anon;
GRANT SELECT ON public.barber_portfolio TO anon;
GRANT SELECT ON public.schedules TO anon;
GRANT SELECT ON public.time_off TO anon;
GRANT SELECT ON public.holidays TO anon;
GRANT SELECT ON public.shop_settings TO anon;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.barbers TO authenticated;
GRANT SELECT ON public.barber_portfolio TO authenticated;
GRANT SELECT ON public.schedules TO authenticated;
GRANT SELECT ON public.time_off TO authenticated;
GRANT SELECT ON public.holidays TO authenticated;
GRANT SELECT ON public.shop_settings TO authenticated;

DROP POLICY IF EXISTS "public read services" ON public.services;
CREATE POLICY "public read services" ON public.services FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "public read barbers" ON public.barbers;
CREATE POLICY "public read barbers" ON public.barbers FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "public read portfolio" ON public.barber_portfolio;
CREATE POLICY "public read portfolio" ON public.barber_portfolio FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read schedules" ON public.schedules;
CREATE POLICY "public read schedules" ON public.schedules FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read time_off" ON public.time_off;
CREATE POLICY "public read time_off" ON public.time_off FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read holidays" ON public.holidays;
CREATE POLICY "public read holidays" ON public.holidays FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read shop_settings" ON public.shop_settings;
CREATE POLICY "public read shop_settings" ON public.shop_settings FOR SELECT TO anon, authenticated USING (true);

-- 3) Customer bookings policies
DROP POLICY IF EXISTS "users read own bookings" ON public.bookings;
CREATE POLICY "users read own bookings" ON public.bookings FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users cancel own pending" ON public.bookings;
CREATE POLICY "users cancel own pending" ON public.bookings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status IN ('pending','cancelled'));

-- 4) Slot availability RPC
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_barber_id uuid,
  p_date date,
  p_duration_minutes integer
) RETURNS SETOF time
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dow integer;
  v_schedule record;
  v_slot time;
  v_step interval := interval '30 minutes';
  v_duration interval;
BEGIN
  v_duration := make_interval(mins => p_duration_minutes);
  v_dow := EXTRACT(DOW FROM p_date)::int;

  -- Holiday check
  IF EXISTS (SELECT 1 FROM public.holidays WHERE holiday_date = p_date) THEN RETURN; END IF;

  -- Time-off check
  IF EXISTS (
    SELECT 1 FROM public.time_off
    WHERE barber_id = p_barber_id
      AND p_date BETWEEN start_date AND end_date
  ) THEN RETURN; END IF;

  SELECT * INTO v_schedule FROM public.schedules
    WHERE barber_id = p_barber_id AND day_of_week = v_dow AND is_off = false
    LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  v_slot := v_schedule.start_time;
  WHILE (v_slot + v_duration) <= v_schedule.end_time LOOP
    -- skip past times if date is today
    IF p_date > CURRENT_DATE OR (p_date = CURRENT_DATE AND v_slot > CURRENT_TIME) THEN
      -- check for conflicting booking
      IF NOT EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.services s ON s.id = b.service_id
        WHERE b.barber_id = p_barber_id
          AND b.booking_date = p_date
          AND b.status IN ('pending','confirmed')
          AND tstzrange(
                (p_date + v_slot)::timestamptz,
                (p_date + v_slot)::timestamptz + v_duration,
                '[)'
              ) && tstzrange(
                (b.booking_date + b.start_time)::timestamptz,
                (b.booking_date + b.start_time)::timestamptz + make_interval(mins => s.duration_minutes),
                '[)'
              )
      ) THEN
        RETURN NEXT v_slot;
      END IF;
    END IF;
    v_slot := v_slot + v_step;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date, integer) TO anon, authenticated;

-- 5) Booking creation RPC (security definer; validates and inserts)
CREATE OR REPLACE FUNCTION public.public_booking_create(
  p_service_id uuid,
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
  v_service public.services;
  v_barber public.barbers;
  v_actual_barber uuid := p_barber_id;
  v_slots time[];
  v_ref text;
  v_row public.bookings;
BEGIN
  -- Validate input lengths
  IF length(coalesce(p_customer_name,'')) < 2 OR length(p_customer_name) > 100 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF length(coalesce(p_customer_phone,'')) < 5 OR length(p_customer_phone) > 30 THEN
    RAISE EXCEPTION 'Invalid phone';
  END IF;

  SELECT * INTO v_service FROM public.services WHERE id = p_service_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service not available'; END IF;

  -- "Any available" if barber is null: pick first barber with slot open
  IF v_actual_barber IS NULL THEN
    SELECT b.id INTO v_actual_barber
    FROM public.barbers b
    WHERE b.is_active = true
      AND p_start_time = ANY(
        SELECT * FROM public.get_available_slots(b.id, p_booking_date, v_service.duration_minutes)
      )
    ORDER BY random()
    LIMIT 1;
    IF v_actual_barber IS NULL THEN RAISE EXCEPTION 'No barber available for that time'; END IF;
  ELSE
    SELECT * INTO v_barber FROM public.barbers WHERE id = v_actual_barber AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Barber not available'; END IF;
    SELECT array_agg(s) INTO v_slots FROM public.get_available_slots(v_actual_barber, p_booking_date, v_service.duration_minutes) s;
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
    v_actual_barber, p_service_id, p_booking_date, p_start_time, 'pending', v_service.price, p_notes, auth.uid()
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_booking_create(uuid, uuid, date, time, text, text, text, text) TO anon, authenticated;
