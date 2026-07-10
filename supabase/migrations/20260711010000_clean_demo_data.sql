-- 1. Delete all demo reviews
DELETE FROM public.reviews;

-- 2. Delete all demo walk-ins (live queue tickets)
DELETE FROM public.walk_ins;

-- 3. Delete all demo bookings and service links
DELETE FROM public.booking_services;
DELETE FROM public.bookings;

-- 4. Delete all barber-related records (portfolio, categories, time-off, schedules, and barbers)
DELETE FROM public.barber_portfolio;
DELETE FROM public.barber_categories;
DELETE FROM public.time_off;
DELETE FROM public.schedules;
DELETE FROM public.barbers;

-- 5. Delete all old notification alerts
DELETE FROM public.notifications;
