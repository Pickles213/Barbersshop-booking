-- Add editable About Us page content fields to shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS about_hero_title text DEFAULT 'OUR STORY',
  ADD COLUMN IF NOT EXISTS about_hero_subtitle text DEFAULT 'More than just haircuts — we''re a community-driven barbershop rooted in craft, culture, and giving back.',
  ADD COLUMN IF NOT EXISTS about_heading text DEFAULT 'BUILT ON THE SOUTHSIDE',
  ADD COLUMN IF NOT EXISTS about_body text DEFAULT 'Southside Barbers started with a single chair and a simple belief: every person deserves a clean cut and a genuine conversation. What began as a small neighborhood shop has grown into a trusted name across multiple branches — but the ethos remains the same.

Our barbers are more than stylists — they''re craftsmen who take pride in precision fades, classic shaves, and making every client feel like they belong. We invest in our team''s growth, source quality products, and keep our prices fair.

Beyond the chair, we believe in lifting up the communities that support us. From charity drives to local sponsorships, giving back is woven into everything we do.',
  ADD COLUMN IF NOT EXISTS about_year text DEFAULT '2024';

