## Database ↔ Codebase Sync Audit — Result: All Green

I inspected the live database against `src/integrations/supabase/types.ts` and the frontend callers. **No mismatches, no missing columns, no permission gaps.** No fixes needed.

### 1. Core tables & columns
All 13 required tables exist with the expected columns and types: `services`, `barbers`, `barber_portfolio`, `bookings`, `walk_ins`, `schedules`, `time_off`, `holidays`, `notifications`, `shop_settings`, `profiles`, `user_roles`, `audit_logs`. Matches `types.ts`.

Note (not a bug): `src/types/db.ts` is a hand-written frontend view-model file with an idealized `Notification { user_id }` that doesn't match the DB. It isn't wired to Supabase queries, so it doesn't cause runtime issues — the generated `types.ts` is the source of truth for Supabase calls.

### 2. Live queue & walk-ins
- `walk_ins` has `queue_number int`, `served_at timestamptz`, `user_id uuid`, `customer_email text` ✅
- `queue_public` view exposes `id, queue_number, first_name, status, created_at, served_at, service_id, duration_minutes` — matches `types.ts` and what `/queue` reads ✅

### 3. RPC functions
Present with correct signatures & `SECURITY DEFINER`:
- `get_available_slots(p_barber_id uuid, p_date date, p_duration_minutes int)`
- `public_booking_create(...)` — 8 params, matches `createBooking` call
- `lookup_customer_by_email(p_email text)` — admin/staff gated
- `has_role(_user_id uuid, _role app_role)`

### 4. RLS & permissions
RLS is enabled with correct policies:
- Anon read: `services`, `barbers`, `barber_portfolio`, `schedules`, `holidays`, `time_off`, `shop_settings`, and `queue_public` view (via security-definer view; anon has no direct SELECT on `walk_ins` PII columns — this was hardened in the last security fix).
- Authenticated read own: `bookings` (`user_id = auth.uid()`), `walk_ins` (`user_id = auth.uid()`), `user_roles`, `profiles`.
- Admin/staff: full manage policies via `has_role()` on all operational tables.

### 5. Realtime
`walk_ins` is in the `supabase_realtime` publication ✅ — the `/queue` channel subscription will receive live updates.

### Plan
Nothing to change. On approval I'll simply confirm the audit result to you (no code or migration edits will run).