
-- Recreate queue_public view including duration_minutes for wait math
DROP VIEW IF EXISTS public.queue_public;
CREATE VIEW public.queue_public
WITH (security_invoker = true)
AS
SELECT
  w.id,
  w.queue_number,
  split_part(coalesce(w.customer_name, 'Guest'), ' ', 1) AS first_name,
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

-- Allow authenticated users to see their own walk_ins row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'walk_ins' AND policyname = 'Users can view their own walk_ins'
  ) THEN
    CREATE POLICY "Users can view their own walk_ins"
    ON public.walk_ins FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;
