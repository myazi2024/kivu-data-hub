
-- Migration de correction: Supprimer le trigger en conflit et améliorer la gestion des erreurs CCC
-- Problème: Deux triggers actifs tentent de générer des codes CCC simultanément

-- 1. Supprimer l'ancien trigger qui entre en conflit avec le nouveau
DROP TRIGGER IF EXISTS trigger_generate_ccc_on_approval ON public.cadastral_contributions;

-- 2. Supprimer l'ancienne fonction associée (non utilisée)
DROP FUNCTION IF EXISTS public.generate_ccc_code_on_approval();

-- 3. Améliorer la fonction auto_generate_ccc_code avec meilleure gestion des erreurs
CREATE OR REPLACE FUNCTION public.auto_generate_ccc_code()
RETURNS TRIGGER AS $$
DECLARE
  v_code TEXT;
  v_value_usd NUMERIC;
  v_existing_code TEXT;
BEGIN
  -- Seulement si la contribution passe de 'pending' à 'approved'
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    
    -- Vérifier qu'un code n'existe pas déjà pour cette contribution
    SELECT code INTO v_existing_code
    FROM cadastral_contributor_codes
    WHERE contribution_id = NEW.id
    LIMIT 1;
    
    -- Si un code existe déjà, ne rien faire (éviter les doublons)
    IF v_existing_code IS NOT NULL THEN
      RAISE NOTICE 'Code CCC déjà existant pour la contribution %: %', NEW.id, v_existing_code;
      RETURN NEW;
    END IF;
    
    -- Vérifier que user_id n'est pas null
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Impossible de générer un code CCC: user_id est NULL pour la contribution %', NEW.id;
    END IF;
    
    -- Générer le code CCC unique
    BEGIN
      v_code := generate_ccc_code();
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors de la génération du code CCC: %', SQLERRM;
    END;
    
    -- Calculer la valeur du code (basé sur les données de la contribution)
    BEGIN
      v_value_usd := calculate_ccc_value(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors du calcul de la valeur CCC: %', SQLERRM;
    END;
    
    -- Valider que la valeur calculée est raisonnable
    IF v_value_usd IS NULL OR v_value_usd < 0 OR v_value_usd > 5 THEN
      RAISE EXCEPTION 'Valeur CCC invalide calculée: %', v_value_usd;
    END IF;
    
    -- Insérer le code CCC dans la table cadastral_contributor_codes
    BEGIN
      INSERT INTO cadastral_contributor_codes (
        code,
        parcel_number,
        user_id,
        contribution_id,
        value_usd,
        is_used,
        is_valid,
        expires_at
      ) VALUES (
        v_code,
        NEW.parcel_number,
        NEW.user_id,
        NEW.id,
        v_value_usd,
        false,
        true,
        NOW() + INTERVAL '90 days'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors de l''insertion du code CCC: %', SQLERRM;
    END;
    
    -- Créer une notification pour l'utilisateur
    BEGIN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        action_url
      ) VALUES (
        NEW.user_id,
        'success',
        'Code CCC généré',
        format('Félicitations ! Votre code CCC %s d''une valeur de %s USD a été généré pour la parcelle %s. Il est valable pendant 90 jours.', v_code, v_value_usd::TEXT, NEW.parcel_number),
        '/user-dashboard?tab=ccc-codes'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Si la notification échoue, log mais ne bloque pas l'approbation
      RAISE NOTICE 'Impossible de créer la notification: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Code CCC % généré avec succès pour la contribution % (valeur: % USD)', v_code, NEW.id, v_value_usd;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. S'assurer que le trigger correct est en place
DROP TRIGGER IF EXISTS trigger_auto_generate_ccc_code ON public.cadastral_contributions;
CREATE TRIGGER trigger_auto_generate_ccc_code
  AFTER UPDATE ON public.cadastral_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_ccc_code();

-- 5. Ajouter un index pour améliorer les performances des vérifications de doublons
CREATE INDEX IF NOT EXISTS idx_contributor_codes_contribution_id 
ON public.cadastral_contributor_codes(contribution_id);

COMMENT ON TRIGGER trigger_auto_generate_ccc_code ON public.cadastral_contributions IS 
'Génère automatiquement un code CCC lorsqu''une contribution passe de pending à approved';
