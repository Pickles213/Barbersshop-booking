## Fix: Walk-in customer search misses registered users

Currently the "Link existing customer" combobox queries `bookings`, so users who signed up but never booked are invisible. Add a `profiles` table that mirrors every registered user and search against it instead.

### 1. Database migration

Create `public.profiles`:
- `id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `email text`
- `full_name text`
- `phone text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()` (with update trigger)

Grants + RLS (admins/staff read; users can read/update their own row):
- `GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;`
- `GRANT ALL ON public.profiles TO service_role;`
- Enable RLS.
- Policy: `SELECT` allowed when `auth.uid() = id` OR `has_role(auth.uid(), 'admin')` OR `has_role(auth.uid(), 'staff')` (staff use the admin walk-ins screen).
- Policy: `UPDATE` own row.

Extend the existing `handle_new_user()` trigger function so it ALSO inserts into `profiles` (keep the existing role-assignment logic intact):
```sql
INSERT INTO public.profiles (id, email, full_name, phone)
VALUES (
  NEW.id,
  NEW.email,
  NEW.raw_user_meta_data->>'full_name',
  NEW.raw_user_meta_data->>'phone'
)
ON CONFLICT (id) DO NOTHING;
```
The existing `on_auth_user_created` trigger on `auth.users` already fires this function, so no new trigger needed.

Backfill existing users in the same migration:
```sql
INSERT INTO public.profiles (id, email, full_name, phone)
SELECT u.id, u.email,
       u.raw_user_meta_data->>'full_name',
       u.raw_user_meta_data->>'phone'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
```

Add `updated_at` trigger via the standard `update_updated_at_column()` helper.

### 2. Frontend — `src/components/admin/walk-ins-page.tsx`

Replace the `existing_customers` query:
- From: `supabase.from("bookings").select("customer_name, customer_phone, customer_email, user_id")…`
- To: `supabase.from("profiles").select("id, full_name, email, phone").order("full_name").limit(500)`

Map results to the existing combobox shape `{ name, phone, email, user_id }` using `full_name ?? email ?? "Unnamed"` as the display name. The rest of the component (selection behavior, auto-fill of customer name, walk-in insert with `customer_phone`) stays unchanged.

No new files. Auto-generated `types.ts` will refresh after the migration; the page edit happens after that.
