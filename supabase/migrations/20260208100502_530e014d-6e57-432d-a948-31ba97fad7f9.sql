
-- Add construction_year column to cadastral_parcels
ALTER TABLE public.cadastral_parcels 
ADD COLUMN construction_year integer;

-- Add construction_year column to cadastral_contributions
ALTER TABLE public.cadastral_contributions 
ADD COLUMN construction_year integer;
