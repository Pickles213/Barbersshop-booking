## Admin Audit Logs

Track every important change in the system so admins can review who did what, when, and what changed.

### Database (one migration)

New table `public.audit_logs`:
- `actor_user_id` (uuid, nullable — null = guest/public action)
- `actor_email` (text, snapshot at time of action)
- `actor_role` (text — admin/staff/customer/guest)
- `action` (text — e.g. `booking.created`, `booking.status_changed`, `service.updated`, `barber.deleted`, `schedule.updated`, `holiday.created`, `walk_in.completed`)
- `entity_type` (text — `booking`, `service`, `barber`, `schedule`, `holiday`, `walk_in`, etc.)
- `entity_id` (uuid, nullable)
- `summary` (text — human-readable line, e.g. "Confirmed booking BK-AB12CD for John Doe")
- `before` (jsonb, nullable — row snapshot before change)
- `after` (jsonb, nullable — row snapshot after change)
- `created_at` (timestamptz)

GRANTs: `service_role` ALL; `authenticated` SELECT (RLS restricts to admins).
RLS: only `has_role(auth.uid(), 'admin')` can SELECT. Inserts go through a `SECURITY DEFINER` function `log_audit(...)` — no direct INSERT policy.

Retention: keep forever (no purge job).

### Automatic capture (DB triggers — can't be bypassed)

`AFTER INSERT/UPDATE/DELETE` triggers writing to `audit_logs` via `log_audit()` on:
- `bookings` — captures create, status change (pending→confirmed/cancelled/completed/no_show), reschedule, delete. Status changes get a dedicated `booking.status_changed` action with old→new in summary.
- `walk_ins` — create, status change, delete.
- `services` — create, update (price/duration/active), delete.
- `barbers` — create, update, delete.
- `schedules` — create, update, delete.
- `holidays` — create, delete.
- `time_off` — create, delete.
- `shop_settings` — update.

Each trigger pulls actor from `auth.uid()` + joins `auth.users` for email + `has_role` for role. Public/guest booking inserts via `public_booking_create` log with `actor_role='guest'`.

### Admin UI

New route `src/routes/admin/audit-logs.tsx` and `src/components/admin/audit-logs-page.tsx`:
- Table: timestamp, actor (email + role badge), action (colored badge by category), entity (type + short id link), summary.
- Filters: date range, action type (multi-select), entity type, actor email search.
- Row click → side sheet showing full before/after JSON diff (highlighted changed fields), plus link to the entity's admin page when applicable.
- Pagination (50 per page, server-side via `range()`).
- "Export CSV" of current filter.

Sidebar entry "Audit Logs" added under admin nav (admins only — hidden for staff via `useAdminAuth` role check).

### Server access

Single server fn `listAuditLogs` with `requireSupabaseAuth` + admin role check, supporting filters/pagination. Reads use RLS as the user (admin-only policy enforces access).

### Out of scope

- Editing/deleting log entries (immutable by design).
- Auth/login event tracking (Supabase Auth already has its own log surface).
- Email/Slack alerts on specific actions.

### Verification

- Migration applies; triggers fire on test insert/update/delete in each tracked table.
- Audit page loads for admin, returns 403/redirect for staff.
- Creating a booking from the customer site appears as `guest` actor; admin status change appears as `admin` actor with before/after diff.
- Filters + CSV export return correct rows.
