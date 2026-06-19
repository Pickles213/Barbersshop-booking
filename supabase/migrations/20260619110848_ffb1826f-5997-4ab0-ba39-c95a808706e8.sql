
-- 1) audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  summary text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Helper to resolve actor email + role
CREATE OR REPLACE FUNCTION public._audit_actor()
RETURNS TABLE (uid uuid, email text, role text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'guest'::text, 'guest'::text;
    RETURN;
  END IF;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;
  IF public.has_role(v_uid, 'admin') THEN v_role := 'admin';
  ELSIF public.has_role(v_uid, 'staff') THEN v_role := 'staff';
  ELSE v_role := 'customer';
  END IF;
  RETURN QUERY SELECT v_uid, v_email, v_role;
END;
$$;

-- 3) Generic trigger writer
CREATE OR REPLACE FUNCTION public._audit_write(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_summary text,
  p_before jsonb,
  p_after jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a record;
BEGIN
  SELECT * INTO a FROM public._audit_actor();
  INSERT INTO public.audit_logs(actor_user_id, actor_email, actor_role, action, entity_type, entity_id, summary, before, after)
  VALUES (a.uid, a.email, a.role, p_action, p_entity_type, p_entity_id, p_summary, p_before, p_after);
END;
$$;

-- 4) Bookings trigger
CREATE OR REPLACE FUNCTION public.tg_audit_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_summary text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_summary := 'Booking ' || COALESCE(NEW.reference,'') || ' created for ' || COALESCE(NEW.customer_name,'(unknown)');
    PERFORM public._audit_write('booking.created','booking',NEW.id,v_summary,NULL,to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_summary := 'Booking ' || COALESCE(NEW.reference,'') || ' status: ' || OLD.status || ' → ' || NEW.status;
      PERFORM public._audit_write('booking.status_changed','booking',NEW.id,v_summary,to_jsonb(OLD),to_jsonb(NEW));
    ELSE
      v_summary := 'Booking ' || COALESCE(NEW.reference,'') || ' updated';
      PERFORM public._audit_write('booking.updated','booking',NEW.id,v_summary,to_jsonb(OLD),to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_summary := 'Booking ' || COALESCE(OLD.reference,'') || ' deleted';
    PERFORM public._audit_write('booking.deleted','booking',OLD.id,v_summary,to_jsonb(OLD),NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS audit_bookings ON public.bookings;
CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_bookings();

-- 5) Walk-ins trigger
CREATE OR REPLACE FUNCTION public.tg_audit_walk_ins()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_summary text; v_id uuid; v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._audit_write('walk_in.created','walk_in',NEW.id,
      'Walk-in added for ' || COALESCE(NEW.customer_name,'(unknown)'), NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_summary := 'Walk-in ' || COALESCE(NEW.customer_name,'') || ' status: ' || OLD.status || ' → ' || NEW.status;
      PERFORM public._audit_write('walk_in.status_changed','walk_in',NEW.id,v_summary,to_jsonb(OLD),to_jsonb(NEW));
    ELSE
      PERFORM public._audit_write('walk_in.updated','walk_in',NEW.id,
        'Walk-in ' || COALESCE(NEW.customer_name,'') || ' updated', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public._audit_write('walk_in.deleted','walk_in',OLD.id,
      'Walk-in ' || COALESCE(OLD.customer_name,'') || ' deleted', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS audit_walk_ins ON public.walk_ins;
CREATE TRIGGER audit_walk_ins AFTER INSERT OR UPDATE OR DELETE ON public.walk_ins
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_walk_ins();

-- 6) Generic table trigger factory: services, barbers, schedules, holidays, time_off, shop_settings
CREATE OR REPLACE FUNCTION public.tg_audit_generic()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entity text := TG_ARGV[0];
  v_label_col text := TG_ARGV[1]; -- column to use in summary
  v_label text;
  v_id uuid;
  v_op text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    EXECUTE format('SELECT ($1).%I::text', v_label_col) INTO v_label USING OLD;
    v_id := (to_jsonb(OLD) ->> 'id')::uuid;
    PERFORM public._audit_write(v_entity || '.deleted', v_entity, v_id,
      initcap(v_entity) || ' "' || COALESCE(v_label,'') || '" deleted', to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    EXECUTE format('SELECT ($1).%I::text', v_label_col) INTO v_label USING NEW;
    v_id := (to_jsonb(NEW) ->> 'id')::uuid;
    PERFORM public._audit_write(v_entity || '.created', v_entity, v_id,
      initcap(v_entity) || ' "' || COALESCE(v_label,'') || '" created', NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    EXECUTE format('SELECT ($1).%I::text', v_label_col) INTO v_label USING NEW;
    v_id := (to_jsonb(NEW) ->> 'id')::uuid;
    PERFORM public._audit_write(v_entity || '.updated', v_entity, v_id,
      initcap(v_entity) || ' "' || COALESCE(v_label,'') || '" updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_services ON public.services;
CREATE TRIGGER audit_services AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_generic('service','name');

DROP TRIGGER IF EXISTS audit_barbers ON public.barbers;
CREATE TRIGGER audit_barbers AFTER INSERT OR UPDATE OR DELETE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_generic('barber','name');

DROP TRIGGER IF EXISTS audit_schedules ON public.schedules;
CREATE TRIGGER audit_schedules AFTER INSERT OR UPDATE OR DELETE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_generic('schedule','barber_id');

DROP TRIGGER IF EXISTS audit_holidays ON public.holidays;
CREATE TRIGGER audit_holidays AFTER INSERT OR UPDATE OR DELETE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_generic('holiday','name');

DROP TRIGGER IF EXISTS audit_time_off ON public.time_off;
CREATE TRIGGER audit_time_off AFTER INSERT OR UPDATE OR DELETE ON public.time_off
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_generic('time_off','barber_id');

DROP TRIGGER IF EXISTS audit_shop_settings ON public.shop_settings;
CREATE TRIGGER audit_shop_settings AFTER INSERT OR UPDATE OR DELETE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_generic('shop_settings','shop_name');
