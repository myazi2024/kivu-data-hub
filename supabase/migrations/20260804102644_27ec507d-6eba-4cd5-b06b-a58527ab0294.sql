CREATE OR REPLACE FUNCTION public.validate_contribution_completeness(contribution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_contribution RECORD;
  v_errors JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
  v_units JSONB;
  v_units_len INT := 0;
  v_units_total NUMERIC := 0;
  v_listing JSONB;
  v_idx INT := 0;
  v_score INT;
BEGIN
  SELECT * INTO v_contribution FROM cadastral_contributions WHERE id = contribution_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errors', jsonb_build_array('Contribution non trouvée'), 'warnings', '[]'::JSONB, 'completeness_score', 0);
  END IF;

  -- Erreurs bloquantes
  IF v_contribution.parcel_number IS NULL OR v_contribution.parcel_number = '' THEN v_errors := v_errors || jsonb_build_array('Numéro de parcelle requis'); END IF;
  IF v_contribution.property_title_type IS NULL THEN v_errors := v_errors || jsonb_build_array('Type de titre foncier requis'); END IF;
  IF v_contribution.current_owner_name IS NULL OR v_contribution.current_owner_name = '' THEN v_errors := v_errors || jsonb_build_array('Nom du propriétaire actuel requis'); END IF;
  IF v_contribution.area_sqm IS NULL OR v_contribution.area_sqm <= 0 THEN v_errors := v_errors || jsonb_build_array('Superficie requise et doit être positive'); END IF;
  IF v_contribution.province IS NULL OR v_contribution.province = '' THEN v_errors := v_errors || jsonb_build_array('Province requise'); END IF;

  -- Avertissements documentaires / historiques
  IF v_contribution.property_title_document_url IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Document de titre foncier non fourni'); END IF;
  IF v_contribution.owner_document_url IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Document d''identité du propriétaire non fourni'); END IF;
  IF v_contribution.gps_coordinates IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Coordonnées GPS non fournies'); END IF;
  IF v_contribution.ownership_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique de propriété non fourni'); END IF;
  IF v_contribution.boundary_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique des bornages non fourni'); END IF;
  IF v_contribution.tax_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique des taxes non fourni'); END IF;

  -- Configuration locative
  IF v_contribution.declared_usage = 'location' AND v_contribution.rental_configuration IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Usage « location » sans mode de mise en location renseigné');
  END IF;

  IF v_contribution.rental_configuration = 'multi' THEN
    v_units := CASE WHEN jsonb_typeof(v_contribution.rental_units) = 'array' THEN v_contribution.rental_units ELSE '[]'::JSONB END;
    v_units_len := jsonb_array_length(v_units);

    IF v_units_len = 0 THEN
      v_warnings := v_warnings || jsonb_build_array('Mode « plusieurs locaux » sans aucun local détaillé');
    ELSE
      IF v_contribution.rental_units_count IS NOT NULL AND v_contribution.rental_units_count <> v_units_len THEN
        v_warnings := v_warnings || jsonb_build_array('Nombre de locaux déclaré différent du nombre de locaux détaillés');
      END IF;

      SELECT COALESCE(SUM(COALESCE((u->>'monthly_rent_usd')::NUMERIC, 0)), 0)
        INTO v_units_total
        FROM jsonb_array_elements(v_units) AS u;

      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_units) AS u
        WHERE COALESCE((u->>'monthly_rent_usd')::NUMERIC, 0) <= 0
      ) THEN
        v_warnings := v_warnings || jsonb_build_array('Au moins un local est déclaré sans loyer mensuel valide');
      END IF;

      IF COALESCE(v_contribution.monthly_rent_usd, 0) > 0
         AND ABS(COALESCE(v_contribution.monthly_rent_usd, 0) - v_units_total) > 0.5 THEN
        v_warnings := v_warnings || jsonb_build_array('Loyer global déclaré différent de la somme des loyers des locaux');
      END IF;
    END IF;
  END IF;

  -- Valeur marchande
  IF v_contribution.has_recent_appraisal IS TRUE AND v_contribution.appraisal_date IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Expertise récente déclarée sans date d''expertise');
  END IF;
  IF v_contribution.appraisal_date IS NOT NULL AND v_contribution.appraisal_date > CURRENT_DATE THEN
    v_warnings := v_warnings || jsonb_build_array('La date d''expertise est postérieure à aujourd''hui');
  END IF;
  IF v_contribution.would_sell_if_offered IS TRUE AND COALESCE(v_contribution.resale_price_usd, 0) <= 0 THEN
    v_warnings := v_warnings || jsonb_build_array('Disposition à vendre déclarée sans prix de revente estimé');
  END IF;

  IF jsonb_typeof(v_contribution.market_listings) = 'array' THEN
    FOR v_listing IN SELECT * FROM jsonb_array_elements(v_contribution.market_listings) LOOP
      v_idx := v_idx + 1;
      IF COALESCE((v_listing->>'listForRent')::BOOLEAN, false) THEN
        IF jsonb_typeof(v_listing->'coverImageUrls') <> 'array'
           OR jsonb_array_length(COALESCE(v_listing->'coverImageUrls', '[]'::JSONB)) = 0 THEN
          v_warnings := v_warnings || jsonb_build_array('Annonce #' || v_idx || ' sans photo de couverture');
        END IF;
        IF COALESCE(v_listing->>'contactValue', '') = '' THEN
          v_warnings := v_warnings || jsonb_build_array('Annonce #' || v_idx || ' sans coordonnée de contact');
        END IF;
      END IF;
    END LOOP;
  END IF;

  v_score := GREATEST(0, 100 - (jsonb_array_length(v_warnings) * 8));

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'completeness_score', v_score
  );
END;
$function$;