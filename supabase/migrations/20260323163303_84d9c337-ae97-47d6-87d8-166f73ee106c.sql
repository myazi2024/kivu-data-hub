
-- Add columns for building shapes (croquis) and dispute details
ALTER TABLE public.cadastral_contributions 
  ADD COLUMN IF NOT EXISTS building_shapes jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispute_data jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.cadastral_contributions.building_shapes IS 'Tracés géométriques des constructions sur le croquis (cercles, rectangles, polygones)';
COMMENT ON COLUMN public.cadastral_contributions.dispute_data IS 'Données détaillées du litige foncier (nature, description, parties, résolution)';
