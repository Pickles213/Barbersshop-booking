## Goal
Build a customer-facing site so visitors can explore services, browse barbers, book a haircut, and (optionally) sign in to see their booking history.

## New customer routes (public, SSR-friendly, each with its own SEO head)
- `/` — Home: hero, featured services preview, top barbers, CTA to book, hours/location strip.
- `/services` — Full service list (from `services` table), grouped by category, with price + duration and "Book" button.
- `/barbers` — Barber cards (avatar, specialization, experience, rating, bio) + portfolio gallery dialog from `barber_portfolio`.
- `/book` — Multi-step booking flow (see below).
- `/contact` — Shop info from `shop_settings`, map embed, hours, payment methods.
- `/my-bookings` — Logged-in customers only; lists their past/upcoming bookings with status + cancel.

The existing `/admin/*` and `/auth` stay untouched. Existing `/auth` will be reused for customer login too (same email/password). Role still defaults to `staff` for new sign-ups via the existing trigger — that's fine; customers don't need a role to view/book.

## Booking flow (`/book`)
4-step wizard (search-param driven so steps are shareable & back-button works):
1. **Choose service** — from `services` (active only).
2. **Choose barber** — list active barbers; "Any available" option.
3. **Choose date & time** — calendar picker; time slots computed from:
   - barber `schedules` for that weekday (`is_off`, `start_time`–`end_time`),
   - subtract `time_off` ranges and `holidays`,
   - subtract already-booked slots in `bookings` (overlap = start ± service duration),
   - slot granularity = 30 min (configurable constant).
   - "Any available" merges open slots across all barbers and assigns one at confirm.
4. **Your details & confirm** — name, phone, email, optional notes. If logged in, prefill from auth user. Submit creates `bookings` row with status `pending`, generates a short reference, shows confirmation page with details.

## Database changes (one migration)
- Add `bookings.user_id uuid null` (nullable so guests still work) referencing `auth.users(id) on delete set null`, plus index.
- Add a `public_booking_create` SQL function `security definer` to insert a booking after validating: service active, barber active, slot inside schedule, no conflict, not on holiday/time-off. Returns the new row. Keeps RLS strict while allowing anon inserts safely.
- RLS adjustments:
  - `services`, `barbers`, `barber_portfolio`, `schedules`, `time_off`, `holidays`, `shop_settings` → add `GRANT SELECT ... TO anon` + `FOR SELECT USING (true)` policy (read-only public catalog).
  - `bookings` → add policy `FOR SELECT TO authenticated USING (user_id = auth.uid())` so customers see only their own; admin policy already covers staff. Inserts go through the SQL function (granted to `anon, authenticated`); also a `FOR UPDATE` policy `user_id = auth.uid() AND status = 'pending'` so users can cancel their own pending bookings.
- A read-only `get_available_slots(barber_id, date, duration)` SQL function to compute open times server-side (avoids leaking other customers' bookings; returns only times).

## Server functions (TanStack `createServerFn`, no auth required for public ones)
- `listServices`, `listBarbers`, `getBarberPortfolio`, `getShopSettings` — public reads via publishable client.
- `getAvailableSlots({ barberId | null, date, serviceId })` — calls SQL function.
- `createBooking(payload)` — calls `public_booking_create`; attaches `user_id` if a session exists.
- `getMyBookings`, `cancelMyBooking` — use `requireSupabaseAuth`.

## UI / shared
- New `src/components/site/` folder: `site-header.tsx` (logo + nav + "Book now" CTA + Sign in/My bookings), `site-footer.tsx`, `service-card.tsx`, `barber-card.tsx`, `portfolio-gallery.tsx`, `booking-wizard/` (Step1Service, Step2Barber, Step3DateTime, Step4Details, Confirmation).
- Reuse shadcn components (Card, Button, Calendar, Dialog, Tabs, Badge, Form, Input).
- Visual style stays consistent with existing admin (same tokens in `src/styles.css`); customer site gets a warmer, marketing feel — hero with shop name from `shop_settings`, large imagery, clear CTAs. No purple gradients.
- Header shows "Sign in" when logged out, "My bookings" + sign-out when logged in. Guest bookings remain fully supported.
- Home `index.tsx` currently has placeholder/admin entry — replace with real customer landing; add a small "Staff login" link in the footer that points to `/auth`.

## Out of scope
- Online payments (cash/GCash/etc. shown as info only).
- Notifications/SMS/email confirmations (status stays `pending` until admin confirms in dashboard).
- Customer profile editing UI.

## Verification
- Build passes; type checks against regenerated Supabase types.
- Manual smoke: browse `/services`, `/barbers`; book as guest end-to-end; sign in, book, see it in `/my-bookings`, cancel; verify the booking appears in admin Bookings page; conflicting slot is hidden after booking.
