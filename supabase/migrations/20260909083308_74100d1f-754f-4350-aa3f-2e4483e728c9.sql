ALTER TABLE public.real_estate_expertise_requests
  ADD COLUMN IF NOT EXISTS building_details jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.real_estate_expertise_requests.building_details IS
  'Fiches par construction expertisée: [{ref,label,property_category,construction_type,...}]';