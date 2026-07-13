-- ====================================================================================
-- Step 3-6: Granular permissions (role defaults + per-barber overrides)
--
-- Run this AFTER 20260711020000_add_barber_role_and_link.sql has been applied
-- and committed (that migration adds the 'barber' enum value this one uses).
-- ====================================================================================

-- ============ Step 3: the three tables ============

CREATE TABLE IF NOT EXISTS public.permissions (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  category text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted boolean NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_key)
);

GRANT SELECT ON public.permissions, public.role_permissions TO authenticated;
GRANT SELECT ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.permissions, public.role_permissions, public.user_permission_overrides TO service_role;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Catalog + role defaults are readable by any logged-in user (not sensitive),
-- writable by admin only.
DROP POLICY IF EXISTS "read permissions" ON public.permissions;
CREATE POLICY "read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage permissions" ON public.permissions;
CREATE POLICY "admins manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "read role_permissions" ON public.role_permissions;
CREATE POLICY "read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage role_permissions" ON public.role_permissions;
CREATE POLICY "admins manage role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Overrides: a barber can read their own overrides, admin manages everyone's.
DROP POLICY IF EXISTS "users read own overrides" ON public.user_permission_overrides;
CREATE POLICY "users read own overrides" ON public.user_permission_overrides
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admins manage overrides" ON public.user_permission_overrides;
CREATE POLICY "admins manage overrides" ON public.user_permission_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Step 4: seed the permission catalog ============
-- Scoped to what the barber portal needs at launch: calendar + bookings.
-- Earnings/payroll permissions get added later, once commission/POS exist.

INSERT INTO public.permissions (key, label, description, category) VALUES
  ('calendar.view',             'View calendar',            'See own bookings on a calendar grid',        'calendar'),
  ('bookings.view_own',         'View own bookings',        'See list of own upcoming/past bookings',     'bookings'),
  ('bookings.update_own_status','Update booking status',    'Mark own bookings complete / no-show',       'bookings'),
  ('schedule.view_own',         'View own schedule',        'See own working hours',                      'schedule'),
  ('schedule.edit_own',         'Edit own schedule',        'Change own working hours',                   'schedule'),
  ('time_off.request_own',      'Request time off',         'Submit own time-off requests',               'schedule'),
  ('reviews.view_own',          'View own reviews',         'See reviews left for self',                  'reviews')
ON CONFLICT (key) DO NOTHING;

-- ============ Step 5: default bundle for the barber role ============
-- Every barber gets these automatically the moment they're linked.
-- time_off.request_own is the only one NOT on by default — admin opts a
-- barber into self-service time-off if they want it; everything else is
-- baseline "monitor my own stuff" access matching the client's original ask.

INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('barber', 'calendar.view'),
  ('barber', 'bookings.view_own'),
  ('barber', 'bookings.update_own_status'),
  ('barber', 'schedule.view_own'),
  ('barber', 'reviews.view_own')
ON CONFLICT DO NOTHING;

-- ============ Step 6: resolution function + login RPC ============

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    -- an override always wins if one exists for this user + permission
    (SELECT granted FROM public.user_permission_overrides
     WHERE user_id = _user_id AND permission_key = _permission_key),
    -- otherwise fall back to whatever the user's role grants by default
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id AND rp.permission_key = _permission_key
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT p.key), ARRAY[]::text[])
  FROM public.permissions p
  WHERE public.has_permission(auth.uid(), p.key)
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
