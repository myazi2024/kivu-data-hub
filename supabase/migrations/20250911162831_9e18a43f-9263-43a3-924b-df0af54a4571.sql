-- Add circonscription_fonciere column if it doesn't exist
ALTER TABLE public.cadastral_parcels 
ADD COLUMN IF NOT EXISTS circonscription_fonciere text DEFAULT 'Circonscription Foncière de Goma';

-- Update existing records with sample data
UPDATE public.cadastral_parcels 
SET circonscription_fonciere = CASE 
  WHEN province = 'Nord-Kivu' AND ville = 'Goma' THEN 'Circonscription Foncière de Goma'
  WHEN province = 'Nord-Kivu' AND ville = 'Butembo' THEN 'Circonscription Foncière de Butembo'
  WHEN province = 'Sud-Kivu' AND ville = 'Bukavu' THEN 'Circonscription Foncière de Bukavu'
  ELSE 'Circonscription Foncière de Goma'
END
WHERE circonscription_fonciere IS NULL;