-- Créer une fonction trigger pour générer automatiquement un code CCC après approbation
CREATE OR REPLACE FUNCTION auto_generate_ccc_code()
RETURNS TRIGGER AS $$
DECLARE
  v_code TEXT;
  v_value_usd NUMERIC;
BEGIN
  -- Seulement si la contribution passe de 'pending' à 'approved'
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    
    -- Générer le code CCC unique
    v_code := generate_ccc_code();
    
    -- Calculer la valeur du code (basé sur les données de la contribution)
    v_value_usd := calculate_ccc_value(NEW.id);
    
    -- Insérer le code CCC dans la table cadastral_contributor_codes
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
    
    -- Créer une notification pour l'utilisateur
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur la table cadastral_contributions
DROP TRIGGER IF EXISTS trigger_auto_generate_ccc_code ON cadastral_contributions;
CREATE TRIGGER trigger_auto_generate_ccc_code
  AFTER UPDATE ON cadastral_contributions
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_ccc_code();

-- Créer une fonction pour valider la complétude d'une contribution
CREATE OR REPLACE FUNCTION validate_contribution_completeness(contribution_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_contribution RECORD;
  v_errors JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
BEGIN
  -- Récupérer la contribution
  SELECT * INTO v_contribution
  FROM cadastral_contributions
  WHERE id = contribution_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'errors', jsonb_build_array('Contribution non trouvée'),
      'warnings', '[]'::JSONB
    );
  END IF;
  
  -- Vérifications obligatoires
  IF v_contribution.parcel_number IS NULL OR v_contribution.parcel_number = '' THEN
    v_errors := v_errors || jsonb_build_array('Numéro de parcelle requis');
  END IF;
  
  IF v_contribution.property_title_type IS NULL THEN
    v_errors := v_errors || jsonb_build_array('Type de titre foncier requis');
  END IF;
  
  IF v_contribution.current_owner_name IS NULL OR v_contribution.current_owner_name = '' THEN
    v_errors := v_errors || jsonb_build_array('Nom du propriétaire actuel requis');
  END IF;
  
  IF v_contribution.area_sqm IS NULL OR v_contribution.area_sqm <= 0 THEN
    v_errors := v_errors || jsonb_build_array('Superficie requise et doit être positive');
  END IF;
  
  IF v_contribution.province IS NULL OR v_contribution.province = '' THEN
    v_errors := v_errors || jsonb_build_array('Province requise');
  END IF;
  
  -- Vérifications recommandées (warnings)
  IF v_contribution.property_title_document_url IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Document de titre foncier non fourni');
  END IF;
  
  IF v_contribution.owner_document_url IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Document d''identité du propriétaire non fourni');
  END IF;
  
  IF v_contribution.gps_coordinates IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Coordonnées GPS non fournies');
  END IF;
  
  IF v_contribution.ownership_history IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Historique de propriété non fourni');
  END IF;
  
  IF v_contribution.boundary_history IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Historique des bornages non fourni');
  END IF;
  
  IF v_contribution.tax_history IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Historique des taxes non fourni');
  END IF;
  
  -- Retourner le résultat
  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'completeness_score', CASE 
      WHEN jsonb_array_length(v_warnings) = 0 THEN 100
      WHEN jsonb_array_length(v_warnings) <= 2 THEN 80
      WHEN jsonb_array_length(v_warnings) <= 4 THEN 60
      ELSE 40
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;