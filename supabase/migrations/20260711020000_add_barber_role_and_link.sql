-- ====================================================================================
-- Step 1 + 2: Add 'barber' role, link barbers to real auth accounts
--
-- This MUST be its own migration, committed on its own, before any later
-- migration references the 'barber' enum value (e.g. inserting into
-- role_permissions with role = 'barber'). Postgres does not allow a newly
-- added enum value to be used inside the same transaction that added it.
-- ====================================================================================

-- 1) Add 'barber' to the existing app_role enum (admin, staff, barber)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'barber';

-- 2) Link a barber row to a real Supabase auth account.
--    Nullable: existing 6 barbers have no login yet until admin invites them.
--    Unique: one login maps to exactly one barber.
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS barbers_user_id_key
  ON public.barbers (user_id)
  WHERE user_id IS NOT NULL;
