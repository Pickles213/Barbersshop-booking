## Queue Management Feature

Build on the existing `walk_ins` table and admin walk-ins page, adding queue numbers, a public live queue display, Google Sign-In, and realtime updates.

### 1. Database (migration)
- Add `queue_number int` and `served_at timestamptz` to `walk_ins`.
- Add a per-day sequence: trigger on insert assigns the next `queue_number` scoped to `date(created_at)`.
- Add narrow `TO anon` SELECT policy exposing only safe columns via a view `public.queue_public` (queue_number, customer_name first-name-only, status, created_at) so guests can watch the queue without seeing phones/emails.
- Enable Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.walk_ins;`
- Add RPC `lookup_customer_by_email(email)` (SECURITY DEFINER, returns id/name/phone) so attendants can find account holders without broad `profiles` read.

### 2. Auth
- Enable Google via `configure_social_auth(["google"])`. Email/password stays for admins.
- Sign-in button on landing + `/queue` page ("Sign in with Google to track your spot").

### 3. Public live queue page — `/queue`
- Lists today's queue in order: `#1 John — In progress`, `#2 Maria — Waiting`, ...
- If signed in and user has an active queue entry (matched by `user_id` or email), highlight "You are #4 in line — about 45 min wait" at the top.
- Realtime subscription refreshes on any walk_ins change.
- Mobile-first, large numbers, auto-refresh badge.

### 4. Admin walk-ins upgrades (`src/components/admin/walk-ins-page.tsx`)
- Add "Check in by email" mode: input email → calls `lookup_customer_by_email` → prefills name/phone/user_id, then adds to queue.
- Keep existing guest add (name only).
- Show `#queue_number` prominently on each queue card.
- Add "Mark serving" (in_progress) and "Done" buttons already exist; ensure `served_at` is stamped on completion.
- Subscribe to realtime so multiple attendants stay in sync.

### 5. Navigation
- Add "Live Queue" link in `src/components/site/site-header.tsx` → `/queue`.
- Landing page CTA: "Check the live queue" alongside "Book now".

### Technical notes
- `walk_ins` already has `user_id`, `customer_name`, `customer_phone`, `status`. Extending it keeps admin queue and walk-in queue as one system.
- Queue number resets daily via trigger using `SELECT COALESCE(MAX(queue_number),0)+1 FROM walk_ins WHERE created_at::date = now()::date`.
- Realtime channel filters on today's date client-side.
- Public view avoids exposing PII; only first name shown to anon.

### Files
- New migration (schema + view + RPC + realtime).
- New: `src/routes/queue.tsx`, `src/components/queue/live-queue.tsx`.
- Edit: `src/components/admin/walk-ins-page.tsx`, `src/components/site/site-header.tsx`, `src/routes/index.tsx`, `src/routes/auth.tsx` (Google button if not already).
- Tool call: `supabase--configure_social_auth`.
