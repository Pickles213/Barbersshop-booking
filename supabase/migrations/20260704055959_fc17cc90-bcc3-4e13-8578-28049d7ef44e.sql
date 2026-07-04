-- Recreate queue_public as a SECURITY DEFINER view so anon/authenticated
-- can read the safe today's-queue projection without needing per-row RLS
-- or column-level grants on public.walk_ins.
DROP VIEW IF EXISTS public.queue_public;

CREATE VIEW public.queue_public
WITH (security_invoker = false) AS
SELECT
  w.id,
  w.queue_number,
  split_part(coalesce(w.customer_name, ''), ' ', 1) AS first_name,
  w.status,
  w.created_at,
  w.served_at,
  w.service_id,
  COALESCE(s.duration_minutes, 30) AS duration_minutes
FROM public.walk_ins w
LEFT JOIN public.services s ON s.id = w.service_id
WHERE (w.created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date
  AND w.status IN ('waiting', 'in_progress');

GRANT SELECT ON public.queue_public TO anon, authenticated;