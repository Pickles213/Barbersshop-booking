## Live Queue — reshape to "Now serving + your position + wait time"

Most infrastructure is already in place (walk_ins queue_number, daily reset trigger, `queue_public` view, Google sign-in, admin email lookup, realtime). This plan refactors the public queue page to match the new spec and adds wait-time math based on service duration.

### 1. Database (small migration)

- Ensure `queue_public` view exposes `service_id` (or `duration_minutes`) so anon can sum wait time without seeing PII. Add `duration_minutes` directly to the view via a join to `services`.
- Add narrow policy allowing an authenticated user to SELECT their own `walk_ins` row (needed so signed-in users can see their queue_number / status without exposing others). If already present from prior turn, skip.
- No new tables.

### 2. Public `/queue` page — rewrite

Remove the full waiting list. Show only:

- **Now serving**: big `#N` from the current `in_progress` row (or `—` if none).
- **If signed in AND has an active ticket** (waiting/in_progress today):
  - "You are Nth in line" (ordinal, based on count of waiting rows with lower queue_number, +1)
  - "About X min wait" = sum of `duration_minutes` for all waiting rows ahead + remaining time of the in-progress row (fallback to service duration if unknown).
  - If in_progress: "You're up now".
- **If signed in with no ticket**: small note "You're not in today's queue — ask the attendant to check you in."
- **If not signed in**: prominent "Sign in with Google to track your spot" button (uses existing `lovable.auth.signInWithOAuth("google")`).
- Realtime subscription on `walk_ins` invalidates queries.
- Mobile-first, giant numbers, live badge.

### 3. Admin walk-ins page

Already has queue numbers, email lookup, realtime, and Done button. Small tweaks:
- Ensure `served_at` is stamped when marking Done (add to the update patch; DB trigger `tg_stamp_served_at` may already do this — verify and rely on it).
- No layout changes.

### 4. Landing page

Add secondary CTA "Check the live queue" → `/queue` next to "Book now" in `src/routes/index.tsx` hero.

### 5. Header

"Live queue" link already added — keep as is.

### Files

- New migration: update `queue_public` view to include `service_id` + `duration_minutes`; add self-select policy on `walk_ins` if missing.
- Rewrite `src/routes/queue.tsx` to the "Now serving + personal" layout.
- Small edit to `src/routes/index.tsx` for the CTA.
- No changes to admin walk-ins page beyond confirming `served_at` behavior.

### Technical notes

- Position lookup for signed-in users: query `walk_ins` filtered by `user_id = auth.uid()`, today, status in (waiting, in_progress). Then read the public view for the ordered waiting list to compute "Nth" and wait sum locally.
- Queue numbers never renumber (already the case — trigger only assigns on insert).
- Wait math: `sum(duration_minutes of rows waiting with queue_number < mine) + (remaining time of in_progress row, estimated as its service duration)`.
