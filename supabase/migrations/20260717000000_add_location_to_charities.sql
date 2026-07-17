-- Add location column to charities table
ALTER TABLE public.charities
  ADD COLUMN location text;
