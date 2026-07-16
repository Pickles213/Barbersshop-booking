-- ====================================================================================
-- Phase 1 quick wins: social media links + promo video autoplay
-- ====================================================================================

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS x_url text,
  ADD COLUMN IF NOT EXISTS about_video_url text;

GRANT SELECT (facebook_url, instagram_url, tiktok_url, x_url, about_video_url) ON public.shop_settings TO anon, authenticated;
