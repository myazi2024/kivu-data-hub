
-- Add construction_materials column to cadastral_parcels
ALTER TABLE public.cadastral_parcels
ADD COLUMN IF NOT EXISTS construction_materials text;

-- Add construction_materials column to cadastral_contributions
ALTER TABLE public.cadastral_contributions
ADD COLUMN IF NOT EXISTS construction_materials text;
