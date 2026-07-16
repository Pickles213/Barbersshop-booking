-- ====================================================================================
-- Dynamic Homepage Assets
-- ====================================================================================

-- 1. Create a public storage bucket for homepage assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('homepage-assets', 'homepage-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
DROP POLICY IF EXISTS "Public read homepage assets" ON storage.objects;
CREATE POLICY "Public read homepage assets"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'homepage-assets');

-- Policies for admin uploads and deletions
DROP POLICY IF EXISTS "Admins upload homepage assets" ON storage.objects;
CREATE POLICY "Admins upload homepage assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homepage-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update homepage assets" ON storage.objects;
CREATE POLICY "Admins update homepage assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'homepage-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete homepage assets" ON storage.objects;
CREATE POLICY "Admins delete homepage assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'homepage-assets' AND public.has_role(auth.uid(), 'admin'));

-- 2. Add columns to shop_settings for dynamic homepage assets
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS hero_slideshow text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS about_image_url text,
  ADD COLUMN IF NOT EXISTS services_image_url text,
  ADD COLUMN IF NOT EXISTS mission_video_url text;

-- 3. Grant SELECT privileges on the new columns to anon and authenticated
GRANT SELECT (hero_slideshow, about_image_url, services_image_url, mission_video_url)
  ON public.shop_settings
  TO anon, authenticated;
