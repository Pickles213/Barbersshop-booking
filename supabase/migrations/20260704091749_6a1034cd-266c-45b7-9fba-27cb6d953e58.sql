
-- Replace SECURITY DEFINER view with a SECURITY DEFINER function for the public live queue
DROP VIEW IF EXISTS public.queue_public;

CREATE OR REPLACE FUNCTION public.get_public_queue()
RETURNS TABLE (
  id uuid,
  queue_number integer,
  first_name text,
  status public.walkin_status,
  created_at timestamptz,
  served_at timestamptz,
  service_id uuid,
  duration_minutes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id,
    w.queue_number,
    split_part(COALESCE(w.customer_name, ''), ' ', 1) AS first_name,
    w.status,
    w.created_at,
    w.served_at,
    w.service_id,
    COALESCE(s.duration_minutes, 30) AS duration_minutes
  FROM public.walk_ins w
  LEFT JOIN public.services s ON s.id = w.service_id
  WHERE ((w.created_at AT TIME ZONE 'UTC')::date = ((now() AT TIME ZONE 'UTC')::date))
    AND w.status IN ('waiting'::walkin_status, 'in_progress'::walkin_status)
  ORDER BY w.queue_number ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_queue() TO anon, authenticated;

-- Harden audit_logs: explicit fail-closed against client-role writes
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- Add explicit restrictive policies denying client writes (defense-in-depth)
DROP POLICY IF EXISTS "No client inserts on audit logs" ON public.audit_logs;
CREATE POLICY "No client inserts on audit logs"
  ON public.audit_logs AS RESTRICTIVE FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates on audit logs" ON public.audit_logs;
CREATE POLICY "No client updates on audit logs"
  ON public.audit_logs AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on audit logs" ON public.audit_logs;
CREATE POLICY "No client deletes on audit logs"
  ON public.audit_logs AS RESTRICTIVE FOR DELETE
  TO anon, authenticated
  USING (false);
