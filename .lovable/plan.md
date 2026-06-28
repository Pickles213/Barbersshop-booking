## Goal
Wire the notifications bell in `src/components/admin/topbar.tsx` to the real `audit_logs` table, showing recent booking activity with an unread badge tracked in `localStorage`.

## Schema note
The user's spec references `table_name`, `action='INSERT'/'UPDATE'`, and `new_data`. The actual `audit_logs` schema in this project uses:
- `entity_type` (instead of `table_name`) — value `'booking'`
- `action` strings like `'booking.created'`, `'booking.status_changed'`, `'booking.updated'`
- `after` jsonb (instead of `new_data`)

The plan keeps the user's intent (new bookings + cancellations only) but maps it to the real columns. No schema or migration changes.

## Implementation — only `src/components/admin/topbar.tsx`

1. Add a `useQuery` (`@tanstack/react-query`, already used elsewhere) that runs:
   ```ts
   supabase.from('audit_logs').select('*')
     .eq('entity_type', 'booking')
     .in('action', ['booking.created', 'booking.status_changed'])
     .gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString())
     .order('created_at', { ascending: false })
     .limit(20)
   ```
   Refetch every 60s and on window focus.

2. Map rows to notifications, dropping anything that doesn't match these two cases:
   - `action === 'booking.created'` → `{ title: "New booking", message: "<customer_name> booked on <booking_date> at <start_time>" }`
   - `action === 'booking.status_changed'` AND `after.status === 'cancelled'` → `{ title: "Booking cancelled", message: "<customer_name>'s booking on <booking_date> was cancelled" }`
   - Otherwise: filter out.
   `customer_name`, `booking_date`, `start_time` come from `row.after` (jsonb).

3. `localStorage` key `seen_audit_ids`, stored as JSON `Array<{ id: string; ts: number }>`:
   - On load: parse, drop entries older than 7 days, write back.
   - Unread badge count = visible notifications whose `id` is not in the seen set.
   - When dropdown opens (`onOpenChange(true)`): add every currently visible notification id (with `ts = Date.now()`) to the seen list and persist.

4. Replace the current bell `<Button>` with a shadcn `DropdownMenu` (already imported across project) containing:
   - Header "Notifications"
   - List of items: title (bold), message (muted), relative time from `created_at` (small/muted).
   - Empty state: "No new notifications".
   - Footer: `<Link to="/admin/audit-logs">View all</Link>` (TanStack Router `Link`).
   - Red dot/count badge stays on the bell when unread > 0 (show number if ≤ 9, else "9+").

5. Relative time: small inline helper (`Math.floor((Date.now()-t)/...)` → "just now", "X minutes ago", "X hours ago", "X days ago"). No new dependency.

## Out of scope
No new files, no migrations, no schema changes, no edits to any other file.
