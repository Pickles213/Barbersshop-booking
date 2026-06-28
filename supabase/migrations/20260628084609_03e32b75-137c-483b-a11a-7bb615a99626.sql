
-- 1. shop_settings: restrict public SELECT to a fixed list of safe columns
REVOKE SELECT ON public.shop_settings FROM anon, authenticated;
GRANT SELECT (id, shop_name, shop_address, shop_phone, shop_email, open_time, close_time, payment_cash, payment_gcash, payment_maya, payment_card, updated_at) ON public.shop_settings TO anon, authenticated;

-- 2. notifications: confirm admin-only intent
COMMENT ON TABLE public.notifications IS 'Admin-only operational notifications. No user_id column by design; not user-facing. Only admins can read/write via RLS.';

-- 3. Lock down internal SECURITY DEFINER helpers — they should not be callable via the API
REVOKE EXECUTE ON FUNCTION public._audit_actor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._audit_write(text, text, uuid, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_bookings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_walk_ins() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_generic() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies; signed-in users need EXECUTE so policies evaluate. Revoke from anon only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

-- public_booking_create + get_available_slots are intentionally callable by guests (anon) for the booking flow.
-- Keep their default grants.
