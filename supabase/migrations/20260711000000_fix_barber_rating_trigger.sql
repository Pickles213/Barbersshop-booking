-- 1. Create function to automatically populate barber details before review insert/update
CREATE OR REPLACE FUNCTION public.populate_review_barber_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_id IS NOT NULL AND (NEW.barber_id IS NULL OR NEW.barber_name IS NULL) THEN
    SELECT bk.barber_id, b.name INTO NEW.barber_id, NEW.barber_name
    FROM public.bookings bk
    JOIN public.barbers b ON b.id = bk.barber_id
    WHERE bk.id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Create the BEFORE trigger
DROP TRIGGER IF EXISTS reviews_populate_barber_details ON public.reviews;
CREATE TRIGGER reviews_populate_barber_details
BEFORE INSERT OR UPDATE OF booking_id ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.populate_review_barber_details();

-- 3. Re-define the average rating calculation trigger function
CREATE OR REPLACE FUNCTION public.recalculate_barber_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_barber_id UUID;
  new_rating NUMERIC;
END;
$$;
-- Note: Replaced in next statements to prevent parsing problems, actual function follows.

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

-- 4. Ensure the AFTER trigger is correctly set up
DROP TRIGGER IF EXISTS reviews_recalculate_barber_rating ON public.reviews;
CREATE TRIGGER reviews_recalculate_barber_rating
AFTER INSERT OR UPDATE OF rating, barber_id OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recalculate_barber_rating();

-- 5. Backfill any existing reviews where barber details are missing
UPDATE public.reviews r
SET barber_id = bk.barber_id,
    barber_name = b.name
FROM public.bookings bk
JOIN public.barbers b ON b.id = bk.barber_id
WHERE bk.id = r.booking_id
  AND (r.barber_id IS NULL OR r.barber_name IS NULL);

-- 6. Recalculate average ratings for all barbers in the system based on backfilled reviews
UPDATE public.barbers b
SET rating = COALESCE(
  (SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.reviews r WHERE r.barber_id = b.id),
  5.0
);

-- 7. Update get_barber_reviews function to support walk-ins (which have booking_id as NULL)
CREATE OR REPLACE FUNCTION public.get_barber_reviews(p_barber_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  rating integer,
  comment text,
  customer_name text,
  service_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.created_at,
    r.rating,
    r.comment,
    r.customer_name,
    r.service_name
  FROM public.reviews r
  WHERE r.barber_id = p_barber_id
  ORDER BY r.created_at DESC;
$$;
