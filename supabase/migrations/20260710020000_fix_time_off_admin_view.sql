-- Drop the security-invoker view and recreate it as a security-definer view
-- This allows admins (who have the authenticated role but restricted direct
-- table privileges) to query the full time_off data including the 'reason' column.
-- Row visibility is still secured by checking public.has_role(auth.uid(), 'admin') in the view itself.

DROP VIEW IF EXISTS public.time_off_admin;

CREATE OR REPLACE VIEW public.time_off_admin
AS
SELECT * FROM public.time_off
WHERE public.has_role(auth.uid(), 'admin');

GRANT SELECT ON public.time_off_admin TO authenticated;
