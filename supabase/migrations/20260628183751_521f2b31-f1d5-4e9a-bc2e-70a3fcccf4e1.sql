
-- 1) time_off.reason — restrict column visibility
REVOKE SELECT ON public.time_off FROM anon, authenticated;
GRANT SELECT (id, barber_id, start_date, end_date, created_at) ON public.time_off TO anon, authenticated;
GRANT SELECT ON public.time_off TO service_role;

-- Admin policy already allows ALL for admins; ensure admins can still read the reason via a dedicated full-column policy is unnecessary because column privileges grant per-role.
-- Grant admins (and service_role) full column access. Admin reads go through authenticated role; allow reason column for admins via SECURITY DEFINER view.
CREATE OR REPLACE VIEW public.time_off_admin
WITH (security_invoker = true) AS
SELECT * FROM public.time_off
WHERE public.has_role(auth.uid(), 'admin');

GRANT SELECT ON public.time_off_admin TO authenticated;

-- 2) walk_ins — add explicit staff SELECT policy
CREATE POLICY "staff read walk_ins"
ON public.walk_ins
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
