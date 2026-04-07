
-- Add lease_years to cadastral_contributions
ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS lease_years integer NULL;

-- Add missing columns to cadastral_parcels for full data propagation on approval
ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS property_category text NULL,
  ADD COLUMN IF NOT EXISTS apartment_number text NULL,
  ADD COLUMN IF NOT EXISTS floor_number text NULL,
  ADD COLUMN IF NOT EXISTS additional_constructions jsonb NULL,
  ADD COLUMN IF NOT EXISTS road_sides jsonb NULL,
  ADD COLUMN IF NOT EXISTS servitude_data jsonb NULL,
  ADD COLUMN IF NOT EXISTS dispute_data jsonb NULL,
  ADD COLUMN IF NOT EXISTS building_shapes jsonb NULL,
  ADD COLUMN IF NOT EXISTS is_title_in_current_owner_name boolean NULL,
  ADD COLUMN IF NOT EXISTS lease_years integer NULL;
