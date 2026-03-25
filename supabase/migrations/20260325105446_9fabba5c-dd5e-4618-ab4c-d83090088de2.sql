
-- Add extended columns to real_estate_expertise_requests
-- These were previously stored as JSON in additional_notes

ALTER TABLE public.real_estate_expertise_requests
  -- Construction materials
  ADD COLUMN IF NOT EXISTS wall_material text,
  ADD COLUMN IF NOT EXISTS roof_material text,
  ADD COLUMN IF NOT EXISTS window_type text,
  ADD COLUMN IF NOT EXISTS floor_material text,
  -- Finishes
  ADD COLUMN IF NOT EXISTS has_plaster boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_painting boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ceiling boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_double_glazing boolean DEFAULT false,
  -- Position
  ADD COLUMN IF NOT EXISTS building_position text,
  ADD COLUMN IF NOT EXISTS facade_orientation text,
  ADD COLUMN IF NOT EXISTS is_corner_plot boolean DEFAULT false,
  -- Sound
  ADD COLUMN IF NOT EXISTS sound_environment text,
  ADD COLUMN IF NOT EXISTS nearby_noise_sources text,
  -- Extended equipment
  ADD COLUMN IF NOT EXISTS has_pool boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_air_conditioning boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_solar_panels boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_generator boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_water_tank boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_borehole boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_electric_fence boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_garage boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_cellar boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_automatic_gate boolean DEFAULT false,
  -- Internet provider
  ADD COLUMN IF NOT EXISTS internet_provider text,
  -- Room counts
  ADD COLUMN IF NOT EXISTS number_of_rooms integer,
  ADD COLUMN IF NOT EXISTS number_of_bedrooms integer,
  ADD COLUMN IF NOT EXISTS number_of_bathrooms integer,
  -- Apartment specific
  ADD COLUMN IF NOT EXISTS apartment_number text,
  ADD COLUMN IF NOT EXISTS floor_number text,
  ADD COLUMN IF NOT EXISTS total_building_floors integer,
  ADD COLUMN IF NOT EXISTS accessibility text,
  ADD COLUMN IF NOT EXISTS monthly_charges numeric,
  ADD COLUMN IF NOT EXISTS has_common_areas boolean DEFAULT false,
  -- Amenities
  ADD COLUMN IF NOT EXISTS nearby_amenities text;
