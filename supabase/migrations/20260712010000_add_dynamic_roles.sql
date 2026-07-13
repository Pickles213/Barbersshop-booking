-- ====================================================================================
-- Discord-style dynamic roles
--
-- Admin stays a separate hardcoded gate (has_role(uid,'admin')) — untouched.
-- This adds a THIRD layer on top of the existing two:
--   1) user_permission_overrides   (personal exception, still wins if set)
--   2) NEW: custom roles           (admin-created, many-to-many, union of grants)
--   3) role_permissions            (old enum-based fallback bundle, kept as safety net)
--
-- Nothing existing is dropped or renamed. This is additive.
-- ====================================================================================

-- ============ New tables ============

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permission_assignments (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

GRANT SELECT ON public.roles, public.role_permission_assignments TO authenticated;
GRANT SELECT ON public.user_role_assignments TO authenticated;
GRANT ALL ON public.roles, public.role_permission_assignments, public.user_role_assignments TO service_role;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permission_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Roles + their permission grants: admin manages, anyone authenticated can read
-- (barbers may want to see their own role name/badge; not sensitive data).
DROP POLICY IF EXISTS "read roles" ON public.roles;
CREATE POLICY "read roles" ON public.roles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage roles" ON public.roles;
CREATE POLICY "admins manage roles" ON public.roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "read role_permission_assignments" ON public.role_permission_assignments;
CREATE POLICY "read role_permission_assignments" ON public.role_permission_assignments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage role_permission_assignments" ON public.role_permission_assignments;
CREATE POLICY "admins manage role_permission_assignments" ON public.role_permission_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Who holds which role: a person can read their own assignments, admin manages everyone's.
DROP POLICY IF EXISTS "users read own role assignments" ON public.user_role_assignments;
CREATE POLICY "users read own role assignments" ON public.user_role_assignments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admins manage role assignments" ON public.user_role_assignments;
CREATE POLICY "admins manage role assignments" ON public.user_role_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Resolution: has_permission() gets a third branch ============
-- Order: personal override wins > custom role grants it > legacy enum bundle grants it.

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1) an explicit personal override always wins if one exists
    (SELECT granted FROM public.user_permission_overrides
     WHERE user_id = _user_id AND permission_key = _permission_key),
    -- 2) does any custom role this user holds grant it?
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      JOIN public.role_permission_assignments rpa ON rpa.role_id = ura.role_id
      WHERE ura.user_id = _user_id AND rpa.permission_key = _permission_key
    )
    OR
    -- 3) fallback: legacy enum-based role bundle (kept so nothing breaks
    --    for anyone not yet assigned a custom role)
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id AND rp.permission_key = _permission_key
    )
  )
$$;

-- get_my_permissions() is unchanged in signature/behavior — it already calls
-- has_permission() per key, so it picks up the new branch automatically.

-- Convenience RPC for the frontend: which custom roles does the caller hold
-- (e.g. to show a "Senior Barber" badge in the portal).
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE(id uuid, name text, description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, r.name, r.description
  FROM public.roles r
  JOIN public.user_role_assignments ura ON ura.role_id = r.id
  WHERE ura.user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

-- ============ Seed: migrate the existing 'barber' bundle into a system role ============
-- So nothing changes for your 6 current barbers on day one. This creates a
-- "Barber" role with the same 5 permissions the enum bundle already grants,
-- and assigns it to every account currently holding the legacy 'barber' role.
-- It's editable afterward like any other role — just marked is_system so the
-- admin UI can warn before deleting it.

INSERT INTO public.roles (name, description, is_system)
VALUES ('Barber', 'Default role migrated from the original barber permission bundle.', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permission_assignments (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN (VALUES
  ('calendar.view'),
  ('bookings.view_own'),
  ('bookings.update_own_status'),
  ('schedule.view_own'),
  ('reviews.view_own')
) AS p(key)
WHERE r.name = 'Barber'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT ur.user_id, r.id
FROM public.user_roles ur
CROSS JOIN public.roles r
WHERE ur.role = 'barber' AND r.name = 'Barber'
ON CONFLICT DO NOTHING;
