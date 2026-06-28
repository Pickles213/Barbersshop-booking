## Auth-gate the booking flow

Require sign-in before booking, preserving the user's intent via a `redirect` search param.

### 1. `src/routes/book.tsx`
- Extend the route's `validateSearch` schema to also accept `redirect: z.string().optional()` (keeps existing `service`/`barber` presets working).
- At the top of `BookPage`, add a `useEffect` that calls `supabase.auth.getUser()`. If no user, `navigate({ to: '/auth', search: { redirect: '/book' } })`.
- Track a small `checkingAuth` state so the page doesn't flash the wizard before the check resolves (render nothing / a minimal loader while checking).

### 2. `src/routes/auth.tsx`
- Add `validateSearch` to the route for `{ redirect?: string }`.
- Read it via `Route.useSearch()` (TanStack's `useSearch` bound to the route).
- In the existing `getUser` effect and after both `handleSignIn` and `handleSignUp` success paths: if `search.redirect` is present, `navigate({ to: search.redirect })`; otherwise keep current admin/customer default redirect logic.

### 3. `src/components/site/site-header.tsx`
- Replace both "Book now" buttons (desktop + mobile sheet) so that when `email` is null they link to `/auth` with `search={{ redirect: '/book' }}`, and when signed in they continue linking to `/book`.

No other files change; no new files created.
