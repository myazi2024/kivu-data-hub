
ALTER TABLE public.land_title_requests
  ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS construction_type text,
  ADD COLUMN IF NOT EXISTS construction_nature text,
  ADD COLUMN IF NOT EXISTS declared_usage text,
  ADD COLUMN IF NOT EXISTS deduced_title_type text,
  ADD COLUMN IF NOT EXISTS selected_parcel_number text,
  ADD COLUMN IF NOT EXISTS construction_materials text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS occupation_duration text;
