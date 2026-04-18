-- 1) RPC: timeline transversale par parcelle (ownership + boundary + tax + mortgages + disputes)
CREATE OR REPLACE FUNCTION public.get_parcel_timeline(_parcel_number text)
RETURNS TABLE(
  event_date timestamptz,
  event_type text,
  source_table text,
  title text,
  description text,
  status text,
  amount_usd numeric,
  reference text,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parcel AS (
    SELECT id FROM cadastral_parcels WHERE parcel_number = _parcel_number AND deleted_at IS NULL LIMIT 1
  )
  -- Ownership
  SELECT
    COALESCE(oh.ownership_start_date::timestamptz, oh.created_at) as event_date,
    'ownership_change'::text,
    'cadastral_ownership_history'::text,
    ('Propriétaire: ' || oh.owner_name)::text,
    COALESCE(oh.mutation_type, 'Mutation de propriété')::text,
    COALESCE(oh.legal_status, '')::text,
    NULL::numeric,
    NULL::text,
    jsonb_build_object('owner_name', oh.owner_name, 'end_date', oh.ownership_end_date)
  FROM cadastral_ownership_history oh
  WHERE oh.parcel_id IN (SELECT id FROM parcel)

  UNION ALL
  -- Boundary
  SELECT
    bh.survey_date::timestamptz,
    'boundary_survey'::text,
    'cadastral_boundary_history'::text,
    ('Bornage: ' || bh.pv_reference_number)::text,
    bh.boundary_purpose,
    'completed'::text,
    NULL::numeric,
    bh.pv_reference_number,
    jsonb_build_object('surveyor', bh.surveyor_name, 'document', bh.boundary_document_url)
  FROM cadastral_boundary_history bh
  WHERE bh.parcel_id IN (SELECT id FROM parcel)

  UNION ALL
  -- Tax
  SELECT
    COALESCE(th.payment_date::timestamptz, th.created_at),
    'tax_payment'::text,
    'cadastral_tax_history'::text,
    ('Impôt foncier ' || th.tax_year)::text,
    NULL::text,
    th.payment_status,
    th.amount_usd,
    NULL::text,
    jsonb_build_object('year', th.tax_year, 'receipt', th.receipt_document_url)
  FROM cadastral_tax_history th
  WHERE th.parcel_id IN (SELECT id FROM parcel)

  UNION ALL
  -- Mortgages
  SELECT
    mo.contract_date::timestamptz,
    'mortgage'::text,
    'cadastral_mortgages'::text,
    ('Hypothèque: ' || mo.creditor_name)::text,
    mo.creditor_type,
    COALESCE(mo.lifecycle_state::text, mo.mortgage_status),
    mo.mortgage_amount_usd,
    mo.reference_number,
    jsonb_build_object('duration_months', mo.duration_months, 'mortgage_id', mo.id)
  FROM cadastral_mortgages mo
  WHERE mo.parcel_id IN (SELECT id FROM parcel)

  UNION ALL
  -- Disputes
  SELECT
    COALESCE(ld.dispute_start_date::timestamptz, ld.created_at),
    'dispute'::text,
    'cadastral_land_disputes'::text,
    ('Litige: ' || ld.reference_number)::text,
    ld.dispute_nature,
    ld.current_status,
    NULL::numeric,
    ld.reference_number,
    jsonb_build_object('declarant', ld.declarant_name, 'stage', ld.resolution_stage, 'escalated', ld.escalated)
  FROM cadastral_land_disputes ld
  WHERE ld.parcel_number = _parcel_number

  ORDER BY event_date DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_parcel_timeline(text) TO authenticated;

-- 2) RPC: alertes croisées litige actif + hypothèque active
CREATE OR REPLACE FUNCTION public.list_dispute_mortgage_overlaps()
RETURNS TABLE(
  parcel_number text,
  parcel_id uuid,
  active_mortgages_count bigint,
  total_mortgage_amount_usd numeric,
  active_disputes_count bigint,
  dispute_references text[],
  mortgage_references text[],
  risk_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_mort AS (
    SELECT
      mo.parcel_id,
      cp.parcel_number,
      COUNT(*) as cnt,
      SUM(mo.mortgage_amount_usd) as total_amt,
      array_agg(mo.reference_number) FILTER (WHERE mo.reference_number IS NOT NULL) as refs
    FROM cadastral_mortgages mo
    JOIN cadastral_parcels cp ON cp.id = mo.parcel_id
    WHERE COALESCE(mo.lifecycle_state::text, mo.mortgage_status) IN ('active', 'approved', 'in_review')
      AND cp.deleted_at IS NULL
    GROUP BY mo.parcel_id, cp.parcel_number
  ),
  active_disp AS (
    SELECT
      ld.parcel_number,
      COUNT(*) as cnt,
      array_agg(ld.reference_number) as refs
    FROM cadastral_land_disputes ld
    WHERE ld.current_status NOT IN ('closed', 'lifted', 'resolu', 'leve')
    GROUP BY ld.parcel_number
  )
  SELECT
    am.parcel_number,
    am.parcel_id,
    am.cnt,
    am.total_amt,
    ad.cnt,
    ad.refs,
    am.refs,
    CASE
      WHEN am.total_amt > 100000 OR ad.cnt > 1 THEN 'high'
      WHEN am.total_amt > 20000 THEN 'medium'
      ELSE 'low'
    END as risk_level
  FROM active_mort am
  JOIN active_disp ad ON ad.parcel_number = am.parcel_number
  ORDER BY am.total_amt DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.list_dispute_mortgage_overlaps() TO authenticated;

-- 3) RPC: générateur de reçu d'hypothèque (réservation entrée document_verifications)
CREATE OR REPLACE FUNCTION public.generate_mortgage_receipt(
  _mortgage_id uuid,
  _payment_id uuid DEFAULT NULL
)
RETURNS TABLE(verification_code text, receipt_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mort record;
  _parcel_number text;
  _code text;
  _new_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  SELECT mo.*, cp.parcel_number INTO _mort
  FROM cadastral_mortgages mo
  JOIN cadastral_parcels cp ON cp.id = mo.parcel_id
  WHERE mo.id = _mortgage_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hypothèque introuvable';
  END IF;

  _code := 'MRC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO document_verifications (
    verification_code, document_type, parcel_number, generated_at,
    is_valid, metadata
  ) VALUES (
    _code, 'mortgage_receipt'::document_type, _mort.parcel_number, now(),
    true,
    jsonb_build_object(
      'mortgage_id', _mortgage_id,
      'payment_id', _payment_id,
      'creditor', _mort.creditor_name,
      'amount_usd', _mort.mortgage_amount_usd,
      'reference', _mort.reference_number
    )
  ) RETURNING id INTO _new_id;

  RETURN QUERY SELECT _code, _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_mortgage_receipt(uuid, uuid) TO authenticated;