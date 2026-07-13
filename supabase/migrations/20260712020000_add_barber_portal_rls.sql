-- ====================================================================================
-- Enable Row Level Security policies for Barbers / Staff in the Barber Portal
-- ====================================================================================

-- 1) Allow barbers to view their own bookings
DROP POLICY IF EXISTS "barbers view own bookings" ON public.bookings;
CREATE POLICY "barbers view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'bookings.view_own') 
    AND barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- 2) Allow barbers to update status or reschedule their own bookings
DROP POLICY IF EXISTS "barbers update own bookings" ON public.bookings;
CREATE POLICY "barbers update own bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    (public.has_permission(auth.uid(), 'bookings.update_own_status') OR public.has_permission(auth.uid(), 'calendar.view'))
    AND barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (public.has_permission(auth.uid(), 'bookings.update_own_status') OR public.has_permission(auth.uid(), 'calendar.view'))
    AND barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- 3) Allow barbers to update their own schedules
DROP POLICY IF EXISTS "barbers update own schedules" ON public.schedules;
CREATE POLICY "barbers update own schedules" ON public.schedules
  FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'schedule.edit_own')
    AND barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'schedule.edit_own')
    AND barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- 4) Allow barbers to insert time off requests for themselves
DROP POLICY IF EXISTS "barbers request time off" ON public.time_off;
CREATE POLICY "barbers request time off" ON public.time_off
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'time_off.request_own')
    AND barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- 5) Allow barbers to view their own time off requests with reason details
DROP POLICY IF EXISTS "barbers view own time off" ON public.time_off;
CREATE POLICY "barbers view own time off" ON public.time_off
  FOR SELECT TO authenticated
  USING (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );
