-- Add standing column to cadastral_contributions
ALTER TABLE public.cadastral_contributions ADD COLUMN IF NOT EXISTS standing text;

-- Add standing column to cadastral_parcels 
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS standing text;