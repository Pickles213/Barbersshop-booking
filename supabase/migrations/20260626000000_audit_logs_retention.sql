-- ============================================================
-- Audit log retention: auto-delete entries older than 3 months
-- ============================================================

-- 1. Function that deletes expired rows
CREATE OR REPLACE FUNCTION public.delete_expired_audit_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.audit_logs
  WHERE created_at < now() - INTERVAL '3 months';
$$;

-- 2. Schedule the function to run once a day using pg_cron
--    (pg_cron is enabled by default on Supabase projects)
SELECT cron.schedule(
  'delete-expired-audit-logs',   -- job name (unique)
  '0 3 * * *',                   -- every day at 3 AM UTC
  $$SELECT public.delete_expired_audit_logs();$$
);
