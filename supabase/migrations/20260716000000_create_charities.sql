-- Create charities table for the About Us page
CREATE TABLE public.charities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  video_url   text,
  event_date  date,
  sort_order  integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Public read access (anyone can view the about page)
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read charities" ON public.charities FOR SELECT USING (true);

-- Admin full access (uses the existing has_role function)
CREATE POLICY "Admin manage charities" ON public.charities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
