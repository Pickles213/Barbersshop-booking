-- Drop old tables if exist
DROP TABLE IF EXISTS public.barber_services;
DROP TABLE IF EXISTS public.barber_categories;

-- Create junction table for mapping categories to barbers
CREATE TABLE IF NOT EXISTS public.barber_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  category text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT barber_categories_barber_id_category_key UNIQUE (barber_id, category)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_barber_categories_barber_id ON public.barber_categories(barber_id);

-- Enable RLS and set policies
ALTER TABLE public.barber_categories ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can see which categories a barber offers
DROP POLICY IF EXISTS "Anyone can view barber categories" ON public.barber_categories;
CREATE POLICY "Anyone can view barber categories"
  ON public.barber_categories FOR SELECT
  TO public
  USING (true);

-- Admin can manage barber categories
DROP POLICY IF EXISTS "Admins can manage barber categories" ON public.barber_categories;
CREATE POLICY "Admins can manage barber categories"
  ON public.barber_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant privileges
GRANT SELECT ON public.barber_categories TO anon, authenticated;
GRANT ALL ON public.barber_categories TO authenticated;

-- Redefine tg_audit_generic to handle non-uuid primary keys (like shop_settings id = 1)
CREATE OR REPLACE FUNCTION public.tg_audit_generic()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entity text := TG_ARGV[0];
  v_label_col text := TG_ARGV[1]; -- column to use in summary
  v_label text;
  v_id_str text;
  v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    EXECUTE format('SELECT ($1).%I::text', v_label_col) INTO v_label USING OLD;
    v_id_str := (to_jsonb(OLD) ->> 'id');
    IF v_id_str ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      v_id := v_id_str::uuid;
    ELSE
      v_id := NULL;
    END IF;
    PERFORM public._audit_write(v_entity || '.deleted', v_entity, v_id,
      initcap(v_entity) || ' "' || COALESCE(v_label,'') || '" deleted', to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    EXECUTE format('SELECT ($1).%I::text', v_label_col) INTO v_label USING NEW;
    v_id_str := (to_jsonb(NEW) ->> 'id');
    IF v_id_str ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      v_id := v_id_str::uuid;
    ELSE
      v_id := NULL;
    END IF;
    PERFORM public._audit_write(v_entity || '.created', v_entity, v_id,
      initcap(v_entity) || ' "' || COALESCE(v_label,'') || '" created', NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    EXECUTE format('SELECT ($1).%I::text', v_label_col) INTO v_label USING NEW;
    v_id_str := (to_jsonb(NEW) ->> 'id');
    IF v_id_str ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      v_id := v_id_str::uuid;
    ELSE
      v_id := NULL;
    END IF;
    PERFORM public._audit_write(v_entity || '.updated', v_entity, v_id,
      initcap(v_entity) || ' "' || COALESCE(v_label,'') || '" updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;
