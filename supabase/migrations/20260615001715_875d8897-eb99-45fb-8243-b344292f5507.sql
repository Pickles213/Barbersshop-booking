
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- First signup becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Haircut',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ BARBERS ============
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialization TEXT,
  experience_years INT NOT NULL DEFAULT 0,
  bio TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage barbers" ON public.barbers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PORTFOLIO ============
CREATE TABLE public.barber_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_portfolio TO authenticated;
GRANT ALL ON public.barber_portfolio TO service_role;
ALTER TABLE public.barber_portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage portfolio" ON public.barber_portfolio FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ BOOKINGS ============
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','in_progress','completed','cancelled','no_show');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE DEFAULT ('BK-' || lpad((floor(random()*100000))::text, 5, '0')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage bookings" ON public.bookings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ WALK-INS ============
CREATE TYPE public.walkin_status AS ENUM ('waiting','in_progress','completed','cancelled');

CREATE TABLE public.walk_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
  status walkin_status NOT NULL DEFAULT 'waiting',
  estimated_wait_minutes INT NOT NULL DEFAULT 15,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.walk_ins TO authenticated;
GRANT ALL ON public.walk_ins TO service_role;
ALTER TABLE public.walk_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage walkins" ON public.walk_ins FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SCHEDULES ============
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_off BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (barber_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage schedules" ON public.schedules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_off TO authenticated;
GRANT ALL ON public.time_off TO service_role;
ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage timeoff" ON public.time_off FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ HOLIDAYS ============
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage holidays" ON public.holidays FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SETTINGS ============
CREATE TABLE public.shop_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shop_name TEXT NOT NULL DEFAULT 'Modern Cuts Barbershop',
  shop_email TEXT,
  shop_phone TEXT,
  shop_address TEXT,
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '20:00',
  payment_cash BOOLEAN NOT NULL DEFAULT true,
  payment_gcash BOOLEAN NOT NULL DEFAULT true,
  payment_maya BOOLEAN NOT NULL DEFAULT false,
  payment_card BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage settings" ON public.shop_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.shop_settings (id, shop_name, shop_email, shop_phone, shop_address)
VALUES (1, 'Modern Cuts Barbershop', 'hello@moderncuts.ph', '+63 917 555 0100', '123 Mabini St, Makati City');

-- ============ SEED DATA ============
INSERT INTO public.services (name, description, category, price, duration_minutes) VALUES
  ('Classic Haircut','Traditional cut with scissors and clippers','Haircut',350,30),
  ('Skin Fade','Precision skin fade with detailed taper','Haircut',450,45),
  ('Beard Trim','Beard shape-up and line-up','Beard',250,20),
  ('Hot Towel Shave','Straight razor shave with hot towel','Shave',600,40),
  ('Hair + Beard Combo','Full haircut and beard service','Combo',750,60),
  ('Kids Cut','Haircut for kids under 12','Haircut',300,30);

INSERT INTO public.barbers (id, name, specialization, experience_years, bio, rating, avatar_url, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111','Marco Reyes','Classic Fades & Skin Fades',8,'Senior barber specializing in precision fades and beard sculpting.',4.9,'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',true),
  ('22222222-2222-2222-2222-222222222222','Jules Santos','Modern Cuts & Textured Styles',6,'Loves crafting textured crops, curtains, and modern pompadours.',4.8,'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',true),
  ('33333333-3333-3333-3333-333333333333','Eli Mendoza','Hot Towel Shaves & Beard Care',10,'Old-school straight razor shaves and beard grooming specialist.',4.7,'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',true),
  ('44444444-4444-4444-4444-444444444444','Sam Villar','Kids Cuts & Family Styles',4,'Patient and friendly — a favorite with first-time customers.',4.6,'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80',true);

INSERT INTO public.barber_portfolio (barber_id, image_url) VALUES
  ('11111111-1111-1111-1111-111111111111','https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80'),
  ('11111111-1111-1111-1111-111111111111','https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80'),
  ('11111111-1111-1111-1111-111111111111','https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80'),
  ('22222222-2222-2222-2222-222222222222','https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80'),
  ('22222222-2222-2222-2222-222222222222','https://images.unsplash.com/photo-1521490878406-d77df8560b3a?w=600&q=80'),
  ('33333333-3333-3333-3333-333333333333','https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=600&q=80'),
  ('33333333-3333-3333-3333-333333333333','https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=600&q=80'),
  ('44444444-4444-4444-4444-444444444444','https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=600&q=80');

-- Default schedules: all barbers Mon-Sat 9-18, Sun off
INSERT INTO public.schedules (barber_id, day_of_week, start_time, end_time, is_off)
SELECT b.id, d, '09:00','18:00', (d = 0)
FROM public.barbers b CROSS JOIN generate_series(0,6) d;

-- Sample bookings (use a service join via subqueries)
INSERT INTO public.bookings (customer_name, customer_phone, barber_id, service_id, booking_date, start_time, status, price) VALUES
  ('Daniel Cruz','+63 917 111 2233','11111111-1111-1111-1111-111111111111',(SELECT id FROM public.services WHERE name='Skin Fade' LIMIT 1), CURRENT_DATE, '10:00','confirmed',450),
  ('Anton Lim','+63 917 222 3344','22222222-2222-2222-2222-222222222222',(SELECT id FROM public.services WHERE name='Beard Trim' LIMIT 1), CURRENT_DATE, '10:30','pending',250),
  ('Rafael Tan','+63 917 333 4455','33333333-3333-3333-3333-333333333333',(SELECT id FROM public.services WHERE name='Hot Towel Shave' LIMIT 1), CURRENT_DATE, '11:15','in_progress',600),
  ('Miguel Reyes','+63 917 444 5566','11111111-1111-1111-1111-111111111111',(SELECT id FROM public.services WHERE name='Hair + Beard Combo' LIMIT 1), CURRENT_DATE, '12:00','confirmed',750),
  ('Jacob Uy','+63 917 555 6677','22222222-2222-2222-2222-222222222222',(SELECT id FROM public.services WHERE name='Kids Cut' LIMIT 1), CURRENT_DATE, '13:00','confirmed',300),
  ('Paolo Garcia','+63 917 666 7788','11111111-1111-1111-1111-111111111111',(SELECT id FROM public.services WHERE name='Skin Fade' LIMIT 1), CURRENT_DATE - 1, '16:30','completed',450),
  ('Vince Aquino','+63 917 777 8899','33333333-3333-3333-3333-333333333333',(SELECT id FROM public.services WHERE name='Beard Trim' LIMIT 1), CURRENT_DATE - 1, '15:00','completed',250),
  ('Leo Bautista','+63 917 888 9900','22222222-2222-2222-2222-222222222222',(SELECT id FROM public.services WHERE name='Hair + Beard Combo' LIMIT 1), CURRENT_DATE - 1, '14:00','cancelled',750),
  ('Niko Flores','+63 917 999 0011','11111111-1111-1111-1111-111111111111',(SELECT id FROM public.services WHERE name='Hot Towel Shave' LIMIT 1), CURRENT_DATE - 1, '11:00','no_show',600);

INSERT INTO public.walk_ins (customer_name, customer_phone, service_id, status, estimated_wait_minutes) VALUES
  ('Walk-in Carlos','+63 917 100 0001',(SELECT id FROM public.services WHERE name='Classic Haircut' LIMIT 1),'waiting',15),
  ('Walk-in Jorge','+63 917 100 0002',(SELECT id FROM public.services WHERE name='Beard Trim' LIMIT 1),'waiting',25);

INSERT INTO public.notifications (title, message, type) VALUES
  ('New booking received','Daniel Cruz booked a Skin Fade for today at 10:00','booking'),
  ('Walk-in waiting','Carlos is waiting for a Classic Haircut','walkin'),
  ('Booking cancelled','Leo Bautista cancelled his Hair + Beard Combo','cancellation');
