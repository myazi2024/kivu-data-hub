-- Ajouter la colonne reference_number à cadastral_mortgages
ALTER TABLE public.cadastral_mortgages
ADD COLUMN IF NOT EXISTS reference_number text UNIQUE;

-- Fonction pour générer automatiquement un numéro de référence unique
CREATE OR REPLACE FUNCTION public.generate_mortgage_reference_number()
RETURNS TRIGGER AS $$
DECLARE
  new_ref text;
  counter int := 0;
BEGIN
  LOOP
    -- Format: HYP-YYYYMM-XXXXX (HYP = Hypothèque, date, 5 caractères aléatoires)
    new_ref := 'HYP-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 5));
    
    -- Vérifier l'unicité
    IF NOT EXISTS (SELECT 1 FROM public.cadastral_mortgages WHERE reference_number = new_ref) THEN
      NEW.reference_number := new_ref;
      EXIT;
    END IF;
    
    counter := counter + 1;
    -- Sécurité: après 10 tentatives, forcer une sortie
    IF counter > 10 THEN
      new_ref := 'HYP-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || UPPER(SUBSTRING(MD5(NOW()::text || RANDOM()::text) FROM 1 FOR 8));
      NEW.reference_number := new_ref;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Créer le trigger pour générer automatiquement le numéro de référence
DROP TRIGGER IF EXISTS trigger_generate_mortgage_reference ON public.cadastral_mortgages;
CREATE TRIGGER trigger_generate_mortgage_reference
  BEFORE INSERT ON public.cadastral_mortgages
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_mortgage_reference_number();

-- Mettre à jour les hypothèques existantes qui n'ont pas de numéro de référence
UPDATE public.cadastral_mortgages
SET reference_number = 'HYP-' || TO_CHAR(created_at, 'YYYYMM') || '-' || UPPER(SUBSTRING(id::text FROM 1 FOR 5))
WHERE reference_number IS NULL;