-- Améliore la résolution géographique du moteur de validation des règles de zonage.
-- 1) Lit la géographie depuis la parcelle mère (cadastral_parcels) via parcel_id.
-- 2) Recherche la règle la plus spécifique parmi tous les niveaux administratifs
--    (urbain : avenue > quartier > commune > ville ; rural : village > groupement > collectivité > territoire),
--    avec fallback sur '*'.

CREATE OR REPLACE FUNCTION public.validate_subdivision_against_rules(_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_parcel RECORD;
  v_rule RECORD;
  v_violations JSONB := '[]'::JSONB;
  v_lot RECORD;
  v_road RECORD;
  v_lot_count INTEGER := 0;
  v_road_count INTEGER := 0;
  v_total_lot_area NUMERIC := 0;
  v_section TEXT;
  v_candidates TEXT[];
BEGIN
  SELECT * INTO v_request FROM public.subdivision_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'violations', jsonb_build_array(jsonb_build_object('code','REQUEST_NOT_FOUND','message','Demande introuvable')));
  END IF;

  -- Récupère la géographie depuis la parcelle mère
  IF v_request.parcel_id IS NOT NULL THEN
    SELECT province, ville, commune, quartier, avenue,
           territoire, collectivite, groupement, village, parcel_type
      INTO v_parcel
      FROM public.cadastral_parcels WHERE id = v_request.parcel_id;
  END IF;

  -- Détermine la section : depuis la parcelle (parcel_type) sinon urban
  v_section := CASE
    WHEN v_parcel.parcel_type IN ('rurale', 'rural') THEN 'rural'
    WHEN v_parcel.parcel_type IN ('urbaine', 'urban') THEN 'urban'
    ELSE 'urban'
  END;

  -- Construit la liste ordonnée des candidats du plus spécifique au plus général
  IF v_section = 'urban' THEN
    v_candidates := ARRAY[
      v_parcel.avenue, v_parcel.quartier, v_parcel.commune, v_parcel.ville, '*'
    ];
  ELSE
    v_candidates := ARRAY[
      v_parcel.village, v_parcel.groupement, v_parcel.collectivite, v_parcel.territoire, '*'
    ];
  END IF;

  -- Cherche la règle la plus spécifique (en respectant l'ordre des candidats)
  SELECT r.* INTO v_rule
  FROM public.subdivision_zoning_rules r
  JOIN LATERAL unnest(v_candidates) WITH ORDINALITY AS c(name, ord) ON r.location_name = c.name
  WHERE r.is_active = true
    AND r.section_type = v_section
    AND c.name IS NOT NULL
  ORDER BY c.ord ASC
  LIMIT 1;

  IF v_rule IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'violations', jsonb_build_array(jsonb_build_object('code','NO_RULE','message','Aucune règle de zonage active pour ' || v_section)));
  END IF;

  -- Itère sur les lots
  FOR v_lot IN
    SELECT * FROM public.subdivision_lots WHERE request_id = _request_id
  LOOP
    v_lot_count := v_lot_count + 1;
    v_total_lot_area := v_total_lot_area + COALESCE(v_lot.area_sqm, 0);

    IF v_lot.area_sqm < v_rule.min_lot_area_sqm THEN
      v_violations := v_violations || jsonb_build_object(
        'code','LOT_TOO_SMALL','severity','error',
        'target', v_lot.lot_number,
        'message', 'Lot ' || v_lot.lot_number || ' : ' || v_lot.area_sqm || ' m² < min ' || v_rule.min_lot_area_sqm || ' m²'
      );
    END IF;

    IF v_rule.max_lot_area_sqm IS NOT NULL AND v_lot.area_sqm > v_rule.max_lot_area_sqm THEN
      v_violations := v_violations || jsonb_build_object(
        'code','LOT_TOO_LARGE','severity','warning',
        'target', v_lot.lot_number,
        'message', 'Lot ' || v_lot.lot_number || ' : ' || v_lot.area_sqm || ' m² > max ' || v_rule.max_lot_area_sqm || ' m²'
      );
    END IF;
  END LOOP;

  -- Itère sur les voies
  FOR v_road IN
    SELECT * FROM public.subdivision_roads WHERE request_id = _request_id
  LOOP
    v_road_count := v_road_count + 1;
    IF COALESCE(v_road.width_m, 0) < v_rule.min_road_width_m THEN
      v_violations := v_violations || jsonb_build_object(
        'code','ROAD_TOO_NARROW','severity','error',
        'target', v_road.road_name,
        'message', 'Voie ' || COALESCE(v_road.road_name,'?') || ' : ' || COALESCE(v_road.width_m,0) || ' m < min ' || v_rule.min_road_width_m || ' m'
      );
    END IF;
  END LOOP;

  -- Nombre max de lots
  IF v_rule.max_lots_per_request IS NOT NULL AND v_lot_count > v_rule.max_lots_per_request THEN
    v_violations := v_violations || jsonb_build_object(
      'code','TOO_MANY_LOTS','severity','error',
      'message', v_lot_count || ' lots > max ' || v_rule.max_lots_per_request
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_violations) = 0,
    'rule_id', v_rule.id,
    'section_type', v_section,
    'matched_location', v_rule.location_name,
    'lot_count', v_lot_count,
    'road_count', v_road_count,
    'total_lot_area_sqm', v_total_lot_area,
    'violations', v_violations
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_subdivision_against_rules(UUID) TO authenticated, anon;