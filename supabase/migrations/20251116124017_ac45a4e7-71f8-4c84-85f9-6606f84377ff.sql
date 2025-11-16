
-- Améliorer le trigger pour gérer aussi les INSERT avec status approved
DROP TRIGGER IF EXISTS trigger_auto_generate_ccc_code ON cadastral_contributions;

CREATE OR REPLACE FUNCTION public.auto_generate_ccc_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_value_usd NUMERIC;
  v_should_generate BOOLEAN := false;
BEGIN
  -- Vérifier si on doit générer un code
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    v_should_generate := true;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    v_should_generate := true;
  END IF;

  -- Générer le code CCC si nécessaire
  IF v_should_generate THEN
    -- Vérifier qu'il n'y a pas déjà un code pour cette contribution
    IF NOT EXISTS (
      SELECT 1 FROM public.cadastral_contributor_codes 
      WHERE contribution_id = NEW.id
    ) THEN
      -- Générer le code et calculer la valeur
      v_code := generate_ccc_code();
      v_value_usd := calculate_ccc_value(NEW.id);
      
      -- Insérer le code CCC
      INSERT INTO public.cadastral_contributor_codes (
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
      
      -- Créer une notification
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
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recréer le trigger pour INSERT et UPDATE
CREATE TRIGGER trigger_auto_generate_ccc_code
  AFTER INSERT OR UPDATE ON cadastral_contributions
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_ccc_code();

-- Générer les codes CCC manquants pour les contributions déjà approuvées
DO $$
DECLARE
  v_contribution RECORD;
  v_code TEXT;
  v_value_usd NUMERIC;
BEGIN
  FOR v_contribution IN 
    SELECT cc.id, cc.parcel_number, cc.user_id
    FROM cadastral_contributions cc
    LEFT JOIN cadastral_contributor_codes ccc ON ccc.contribution_id = cc.id
    WHERE cc.status = 'approved' AND ccc.id IS NULL
  LOOP
    -- Générer le code et calculer la valeur
    v_code := generate_ccc_code();
    v_value_usd := calculate_ccc_value(v_contribution.id);
    
    -- Insérer le code CCC
    INSERT INTO public.cadastral_contributor_codes (
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
      v_contribution.parcel_number,
      v_contribution.user_id,
      v_contribution.id,
      v_value_usd,
      false,
      true,
      NOW() + INTERVAL '90 days'
    );
    
    -- Créer une notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      action_url
    ) VALUES (
      v_contribution.user_id,
      'success',
      'Code CCC généré',
      format('Félicitations ! Votre code CCC %s d''une valeur de %s USD a été généré pour la parcelle %s. Il est valable pendant 90 jours.', v_code, v_value_usd::TEXT, v_contribution.parcel_number),
      '/user-dashboard?tab=ccc-codes'
    );
  END LOOP;
END;
$$;
