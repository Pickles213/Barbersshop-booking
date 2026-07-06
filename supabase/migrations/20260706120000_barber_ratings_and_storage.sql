-- ============================================================
-- 1. Auto-calculate barber rating from customer reviews
--    (removes the need for admins to type a rating manually)
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_barber_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_barber_id UUID;
  new_rating NUMERIC;
BEGIN
  target_barber_id := COALESCE(NEW.barber_id, OLD.barber_id);

  IF target_barber_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 5.0)
  INTO new_rating
  FROM public.reviews
  WHERE barber_id = target_barber_id;

  UPDATE public.barbers
  SET rating = new_rating
  WHERE id = target_barber_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_recalculate_barber_rating ON public.reviews;
CREATE TRIGGER reviews_recalculate_barber_rating
AFTER INSERT OR UPDATE OF rating, barber_id OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recalculate_barber_rating();

-- Backfill ratings for barbers that already have reviews
UPDATE public.barbers b
SET rating = COALESCE(
  (SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.reviews r WHERE r.barber_id = b.id),
  b.rating
);

-- ============================================================
-- 2. Storage buckets for barber avatar + portfolio photo uploads
--    (replaces manual "paste a URL" fields with real file uploads)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-avatars', 'barber-avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-portfolio', 'barber-portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view the images (they're shown on the public site)
DROP POLICY IF EXISTS "Public read barber avatars" ON storage.objects;
CREATE POLICY "Public read barber avatars"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'barber-avatars');

DROP POLICY IF EXISTS "Public read barber portfolio" ON storage.objects;
CREATE POLICY "Public read barber portfolio"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'barber-portfolio');

-- Only admins can upload / replace / remove images
DROP POLICY IF EXISTS "Admins upload barber avatars" ON storage.objects;
CREATE POLICY "Admins upload barber avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'barber-avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update barber avatars" ON storage.objects;
CREATE POLICY "Admins update barber avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'barber-avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete barber avatars" ON storage.objects;
CREATE POLICY "Admins delete barber avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'barber-avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins upload barber portfolio" ON storage.objects;
CREATE POLICY "Admins upload barber portfolio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'barber-portfolio' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update barber portfolio" ON storage.objects;
CREATE POLICY "Admins update barber portfolio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'barber-portfolio' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete barber portfolio" ON storage.objects;
CREATE POLICY "Admins delete barber portfolio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'barber-portfolio' AND public.has_role(auth.uid(), 'admin'));
