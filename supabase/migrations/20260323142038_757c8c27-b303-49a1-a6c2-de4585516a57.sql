
-- Add missing columns for road_sides, servitude_data, and has_dispute
ALTER TABLE public.cadastral_contributions 
  ADD COLUMN IF NOT EXISTS road_sides jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS servitude_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_dispute boolean DEFAULT NULL;
