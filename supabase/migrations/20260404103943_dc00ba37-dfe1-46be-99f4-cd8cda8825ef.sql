ALTER TABLE public.land_title_requests
  ADD COLUMN IF NOT EXISTS standing text,
  ADD COLUMN IF NOT EXISTS construction_year integer,
  ADD COLUMN IF NOT EXISTS floor_number text;