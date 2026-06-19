
REVOKE ALL ON FUNCTION public._audit_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._audit_write(text,text,uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_audit_bookings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_audit_walk_ins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_audit_generic() FROM PUBLIC, anon, authenticated;
