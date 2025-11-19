-- Hotfix: restore deprecated parcel_type column on cadastral_contributions
-- to satisfy existing triggers/functions that still reference NEW.parcel_type

ALTER TABLE public.cadastral_contributions
ADD COLUMN IF NOT EXISTS parcel_type TEXT NULL;

COMMENT ON COLUMN public.cadastral_contributions.parcel_type IS
  'Type de parcelle (SU/SR) conservé pour compatibilité avec des fonctions existantes. Non utilisé par le front-end.';