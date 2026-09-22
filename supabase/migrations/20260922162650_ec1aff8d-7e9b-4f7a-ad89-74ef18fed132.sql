CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_cadastral_parcels_number_trgm
  ON public.cadastral_parcels USING gin (parcel_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cadastral_parcels_title_ref_trgm
  ON public.cadastral_parcels USING gin (title_reference_number gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.get_cadastral_parcel_data(p_parcel_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parcel_id uuid;
  v_parcel jsonb;
  v_user_id uuid;
  v_free_access boolean := false;
  v_paid_services text[];
  v_result jsonb;
  v_test_mode boolean := false;
  v_payment_enabled boolean := true;
  v_number text;
BEGIN
  v_user_id := auth.uid();
  -- Correspondance stricte : plus aucun joker (%, _) exploitable.
  v_number := upper(btrim(coalesce(p_parcel_number, '')));

  IF v_number = '' THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT id INTO v_parcel_id
  FROM cadastral_parcels
  WHERE upper(parcel_number) = v_number
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_parcel_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT COALESCE((config_value->>'enabled')::boolean, false) INTO v_test_mode
  FROM cadastral_search_config
  WHERE config_key = 'test_mode' AND is_active = true
  LIMIT 1;

  SELECT COALESCE((config_value->>'enabled')::boolean, true) INTO v_payment_enabled
  FROM cadastral_search_config
  WHERE config_key = 'payment_mode' AND is_active = true
  LIMIT 1;

  v_free_access := (NOT v_payment_enabled) OR v_test_mode;

  IF v_user_id IS NOT NULL THEN
    SELECT array_agg(service_type) INTO v_paid_services
    FROM cadastral_service_access
    WHERE user_id = v_user_id
      AND upper(parcel_number) = v_number
      AND (expires_at IS NULL OR expires_at > now());
  END IF;

  v_paid_services := COALESCE(v_paid_services, ARRAY[]::text[]);

  IF v_free_access OR 'information' = ANY(v_paid_services) THEN
    SELECT to_jsonb(p.*) INTO v_parcel
    FROM cadastral_parcels p
    WHERE p.id = v_parcel_id;
  ELSE
    SELECT jsonb_build_object(
      'id', p.id,
      'parcel_number', p.parcel_number,
      'parcel_type', p.parcel_type,
      'commune', p.commune,
      'quartier', p.quartier,
      'province', p.province,
      'ville', p.ville
    ) INTO v_parcel
    FROM cadastral_parcels p
    WHERE p.id = v_parcel_id;
  END IF;

  v_result := jsonb_build_object(
    'parcel', v_parcel,
    'ownership_history', CASE
      WHEN v_free_access OR 'history' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(oh.*) ORDER BY oh.ownership_start_date DESC), '[]'::jsonb)
        FROM cadastral_ownership_history oh WHERE oh.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'tax_history', CASE
      WHEN v_free_access OR 'obligations' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(th.*) ORDER BY th.tax_year DESC), '[]'::jsonb)
        FROM cadastral_tax_history th WHERE th.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'mortgage_history', CASE
      WHEN v_free_access OR 'obligations' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(
          to_jsonb(m.*) || jsonb_build_object('cadastral_mortgage_payments',
            COALESCE((
              SELECT jsonb_agg(to_jsonb(mp.*) ORDER BY mp.payment_date DESC)
              FROM cadastral_mortgage_payments mp WHERE mp.mortgage_id = m.id
            ), '[]'::jsonb)
          )
        ORDER BY m.contract_date DESC), '[]'::jsonb)
        FROM cadastral_mortgages m WHERE m.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'boundary_history', CASE
      WHEN v_free_access OR 'location_history' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(bh.*) ORDER BY bh.survey_date DESC), '[]'::jsonb)
        FROM cadastral_boundary_history bh WHERE bh.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'building_permits', CASE
      WHEN v_free_access OR 'information' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(bp.*) ORDER BY bp.issue_date DESC), '[]'::jsonb)
        FROM cadastral_building_permits bp WHERE bp.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'land_disputes', CASE
      WHEN v_free_access OR 'land_disputes' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(ld.*) ORDER BY ld.created_at DESC), '[]'::jsonb)
        FROM cadastral_land_disputes ld
        WHERE upper(ld.parcel_number) = v_number
          AND ld.dispute_type = 'report'
      )
      ELSE '[]'::jsonb
    END,
    'legal_verification', CASE
      WHEN v_free_access OR 'legal_verification' = ANY(v_paid_services) THEN
        jsonb_build_object(
          'title_type', v_parcel->>'property_title_type',
          'title_reference', v_parcel->>'title_reference_number',
          'title_issue_date', v_parcel->>'title_issue_date',
          'title_document_url', v_parcel->>'property_title_document_url',
          'owner_document_url', v_parcel->>'owner_document_url',
          'has_dispute', COALESCE((v_parcel->>'has_dispute')::boolean, false),
          'is_subdivided', COALESCE((v_parcel->>'is_subdivided')::boolean, false),
          'parcel_verified', true
        )
      ELSE NULL
    END
  );

  RETURN v_result;
END;
$function$;

-- Recherche publique par fragment : uniquement des données non confidentielles.
CREATE OR REPLACE FUNCTION public.search_parcels_public(
  p_query text,
  p_mode text DEFAULT 'parcel',
  p_limit integer DEFAULT 5,
  p_test_mode boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  parcel_number text,
  title_reference_number text,
  province text,
  ville text,
  commune text,
  quartier text,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT
      -- Neutralisation des jokers : la saisie reste un simple fragment de texte.
      replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') AS frag,
      GREATEST(1, LEAST(coalesce(p_limit, 5), 20)) AS lim
  )
  SELECT p.id, p.parcel_number, p.title_reference_number,
         p.province, p.ville, p.commune, p.quartier,
         p.latitude, p.longitude
  FROM cadastral_parcels p, q
  WHERE p.deleted_at IS NULL
    AND q.frag <> ''
    AND (
      CASE WHEN p_test_mode
        THEN p.parcel_number ILIKE 'TEST-%'
        ELSE p.parcel_number NOT ILIKE 'TEST-%'
      END
    )
    AND (
      p.parcel_number ILIKE '%' || q.frag || '%'
      OR p.title_reference_number ILIKE '%' || q.frag || '%'
    )
  ORDER BY
    CASE
      WHEN p_mode = 'title' AND p.title_reference_number ILIKE q.frag || '%' THEN 0
      WHEN p_mode = 'title' AND p.title_reference_number ILIKE '%' || q.frag || '%' THEN 1
      WHEN p.parcel_number ILIKE q.frag || '%' THEN 0
      WHEN p.parcel_number ILIKE '%' || q.frag || '%' THEN 1
      ELSE 2
    END,
    p.parcel_number
  LIMIT (SELECT lim FROM q);
$function$;

REVOKE ALL ON FUNCTION public.search_parcels_public(text, text, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_parcels_public(text, text, integer, boolean) TO anon, authenticated, service_role;