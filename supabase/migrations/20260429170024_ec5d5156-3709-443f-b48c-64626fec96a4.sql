-- Add building target tracking columns to expertise requests
ALTER TABLE public.real_estate_expertise_requests
  ADD COLUMN IF NOT EXISTS target_building_ref text,
  ADD COLUMN IF NOT EXISTS target_building_label text,
  ADD COLUMN IF NOT EXISTS cadastre_discrepancies text;

COMMENT ON COLUMN public.real_estate_expertise_requests.target_building_ref IS 'Reference of the targeted building: ''main'', ''extra-<index>'' (from cadastral_parcels.additional_constructions), or ''new'' for an undeclared construction.';
COMMENT ON COLUMN public.real_estate_expertise_requests.target_building_label IS 'Human-readable label of the targeted building captured at request time.';
COMMENT ON COLUMN public.real_estate_expertise_requests.cadastre_discrepancies IS 'Free-text notes when the user corrected pre-filled CCC data; surfaced to admin/expert for cadastre reconciliation.';