-- Add missing columns to cadastral_contributions for full data persistence
ALTER TABLE public.cadastral_contributions 
  ADD COLUMN IF NOT EXISTS apartment_number TEXT,
  ADD COLUMN IF NOT EXISTS floor_number TEXT,
  ADD COLUMN IF NOT EXISTS property_category TEXT;
