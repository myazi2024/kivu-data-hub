
ALTER TABLE public.cadastral_contributions ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS house_number TEXT;
