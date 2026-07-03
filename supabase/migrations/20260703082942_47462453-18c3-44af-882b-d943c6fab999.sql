
-- Add queue-tracking columns
ALTER TABLE public.walk_ins
  ADD COLUMN IF NOT EXISTS queue_number int,
  ADD COLUMN IF NOT EXISTS served_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_email text;

-- Per-day queue number trigger
CREATE OR REPLACE FUNCTION public.tg_assign_queue_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.queue_number IS NULL THEN
    SELECT COALESCE(MAX(queue_number), 0) + 1
      INTO NEW.queue_number
    FROM public.walk_ins
    WHERE (created_at AT TIME ZONE 'UTC')::date = (COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC')::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_queue_number ON public.walk_ins;
CREATE TRIGGER assign_queue_number
  BEFORE INSERT ON public.walk_ins
  FOR EACH ROW EXECUTE FUNCTION public.tg_assign_queue_number();

-- Stamp served_at on completion
CREATE OR REPLACE FUNCTION public.tg_stamp_served_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.served_at IS NULL THEN
    NEW.served_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_served_at ON public.walk_ins;
CREATE TRIGGER stamp_served_at
  BEFORE UPDATE ON public.walk_ins
  FOR EACH ROW EXECUTE FUNCTION public.tg_stamp_served_at();

-- Backfill queue numbers for existing rows
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY (created_at AT TIME ZONE 'UTC')::date ORDER BY created_at) AS rn
  FROM public.walk_ins
  WHERE queue_number IS NULL
)
UPDATE public.walk_ins w
SET queue_number = o.rn
FROM ordered o
WHERE w.id = o.id;

-- Public safe view: only first name + queue info, today only
CREATE OR REPLACE VIEW public.queue_public
WITH (security_invoker = true)
AS
SELECT
  id,
  queue_number,
  split_part(customer_name, ' ', 1) AS first_name,
  status::text AS status,
  created_at,
  served_at
FROM public.walk_ins
WHERE (created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date;

GRANT SELECT ON public.queue_public TO anon, authenticated;

-- Allow anon to read minimal columns via view (view uses invoker rights,
-- so we need an anon SELECT policy on walk_ins limited to today, safe cols only via view).
-- Add a permissive today-only read policy for anon/authenticated. The view is
-- the only intended read path; we accept row-level exposure of full table to
-- respect security_invoker. Restrict via column grants instead.
REVOKE ALL ON public.walk_ins FROM anon;
GRANT SELECT (id, queue_number, customer_name, status, created_at, served_at) ON public.walk_ins TO anon;

DROP POLICY IF EXISTS "anon read today queue" ON public.walk_ins;
CREATE POLICY "anon read today queue" ON public.walk_ins
  FOR SELECT
  TO anon
  USING ((created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date);

DROP POLICY IF EXISTS "auth read today queue" ON public.walk_ins;
CREATE POLICY "auth read today queue" ON public.walk_ins
  FOR SELECT
  TO authenticated
  USING ((created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date);

-- Lookup RPC for attendants: find a customer by email
CREATE OR REPLACE FUNCTION public.lookup_customer_by_email(p_email text)
RETURNS TABLE(user_id uuid, full_name text, email text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.full_name, p.email, p.phone
    FROM public.profiles p
    WHERE lower(p.email) = lower(trim(p_email))
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_customer_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_customer_by_email(text) TO authenticated;

-- Realtime
ALTER TABLE public.walk_ins REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'walk_ins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.walk_ins;
  END IF;
END $$;
