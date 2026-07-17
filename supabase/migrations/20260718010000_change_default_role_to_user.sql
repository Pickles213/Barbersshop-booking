-- 1) Add 'user' to app_role enum if it doesn't exist
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

-- 2) Update the handle_new_user trigger function to default new users to 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END; $$;

-- 3) Insert 'user' role into dynamic roles table
INSERT INTO public.roles (name, description, is_system)
VALUES ('user', 'Standard registered customer profile', true)
ON CONFLICT (name) DO NOTHING;

-- 4) Update existing users who are currently 'staff' to 'user' in legacy table
UPDATE public.user_roles
SET role = 'user'
WHERE role = 'staff';

-- 5) Sync dynamic role assignments for the updated roles
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT ur.user_id, r.id
FROM public.user_roles ur
JOIN public.roles r ON r.name = ur.role::text
ON CONFLICT (user_id, role_id) DO NOTHING;
