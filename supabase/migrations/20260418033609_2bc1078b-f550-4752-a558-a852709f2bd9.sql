ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS rental_start_date DATE;
ALTER TABLE public.cadastral_contributions ADD COLUMN IF NOT EXISTS rental_start_date DATE;