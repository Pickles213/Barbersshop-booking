-- ====================================================================================
-- Phase 2: POS, Payments, Discounts, Commissions, and Google Review Link
-- ====================================================================================

-- 1) Add Google Review URL to shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS google_review_url text;

-- 2) Create Discounts table
CREATE TABLE IF NOT EXISTS public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'amount')),
  value numeric NOT NULL CHECK (value > 0),
  is_active boolean NOT NULL DEFAULT true,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Create Payments table to record POS cash/GCash transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  walk_in_id uuid REFERENCES public.walk_ins(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'gcash', 'maya', 'card')),
  discount_id uuid REFERENCES public.discounts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_at_least_one_source CHECK (booking_id IS NOT NULL OR walk_in_id IS NOT NULL)
);

-- 4) Create Barber Commissions table
CREATE TABLE IF NOT EXISTS public.barber_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  walk_in_id uuid REFERENCES public.walk_ins(id) ON DELETE SET NULL,
  gross_amount numeric NOT NULL CHECK (gross_amount >= 0),
  commission_rate numeric NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount numeric NOT NULL CHECK (commission_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_at_least_one_source CHECK (booking_id IS NOT NULL OR walk_in_id IS NOT NULL)
);

-- 5) Add default commission_rate column to barbers table
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 50 CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- 6) Enable RLS on new tables
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_commissions ENABLE ROW LEVEL SECURITY;

-- 7) Grant permissions to authenticated and service_role
GRANT SELECT ON public.discounts TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.barber_commissions TO authenticated;

GRANT ALL ON public.discounts, public.payments, public.barber_commissions TO service_role;

-- 8) Policies
-- Discounts: Authenticated users can select/read active discounts (e.g. at checkout); Admin can manage them.
DROP POLICY IF EXISTS "read active discounts" ON public.discounts;
CREATE POLICY "read active discounts" ON public.discounts
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admins manage discounts" ON public.discounts;
CREATE POLICY "admins manage discounts" ON public.discounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Payments: Authenticated users with POS permissions can manage payments; Admin has full access.
DROP POLICY IF EXISTS "staff manage payments" ON public.payments;
CREATE POLICY "staff manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'pos.manage') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_permission(auth.uid(), 'pos.manage') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "users read own payments" ON public.payments;
CREATE POLICY "users read own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    (booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid()))
    OR
    (walk_in_id IN (SELECT id FROM public.walk_ins WHERE user_id = auth.uid()))
  );

-- Barber Commissions: Barbers can view their own commissions; Admin can manage all.
DROP POLICY IF EXISTS "barbers view own commissions" ON public.barber_commissions;
CREATE POLICY "barbers view own commissions" ON public.barber_commissions
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'commissions.view_own') 
    AND barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admins manage commissions" ON public.barber_commissions;
CREATE POLICY "admins manage commissions" ON public.barber_commissions
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'commissions.manage') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_permission(auth.uid(), 'commissions.manage') OR public.has_role(auth.uid(), 'admin'));

-- 9) Seed POS & Commissions Permissions
INSERT INTO public.permissions (key, label, description, category) VALUES
  ('pos.manage', 'Manage POS Checkout', 'Permits checking out appointments, applying discounts, and recording payments', 'pos'),
  ('commissions.view_own', 'View Own Commissions', 'See own commissions / earnings breakdown in barber portal', 'commissions'),
  ('commissions.manage', 'Manage Commissions/Payroll', 'View and export payroll and commissions rollup reports', 'commissions')
ON CONFLICT (key) DO NOTHING;

-- Grant default permissions to barber role
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('barber', 'commissions.view_own')
ON CONFLICT DO NOTHING;

-- 10) Grant SELECT privileges on the newly added settings columns to anon and authenticated
GRANT SELECT (google_review_url, about_hero_title, about_hero_subtitle, about_heading, about_body, about_year)
  ON public.shop_settings
  TO anon, authenticated;
