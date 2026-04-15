-- Add hosting capacity columns to cadastral_contributions
ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS is_occupied boolean,
  ADD COLUMN IF NOT EXISTS occupant_count integer,
  ADD COLUMN IF NOT EXISTS hosting_capacity integer;

-- Add hosting capacity columns to cadastral_parcels
ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS is_occupied boolean,
  ADD COLUMN IF NOT EXISTS occupant_count integer,
  ADD COLUMN IF NOT EXISTS hosting_capacity integer;