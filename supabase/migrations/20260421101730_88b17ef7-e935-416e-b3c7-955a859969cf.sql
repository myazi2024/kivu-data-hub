
-- =====================================================================
-- Sprint 1 + 2 — Facturation & Commerce
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Étendre get_admin_pending_counts() : payments = publications + cadastre
--    + expertise + permit (toutes sources financières en attente).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_pending_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'contributions', 0, 'land_titles', 0, 'permits', 0,
      'mutations', 0, 'expertise', 0, 'subdivisions', 0,
      'payments', 0, 'disputes', 0, 'mortgages', 0
    );
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::app_role)
             OR public.has_role(v_uid, 'super_admin'::app_role);

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'contributions', 0, 'land_titles', 0, 'permits', 0,
      'mutations', 0, 'expertise', 0, 'subdivisions', 0,
      'payments', 0, 'disputes', 0, 'mortgages', 0
    );
  END IF;

  SELECT jsonb_build_object(
    'contributions', (
      SELECT COUNT(*) FROM public.cadastral_contributions
      WHERE status IN ('pending','under_review')
    ),
    'land_titles', (
      SELECT COUNT(*) FROM public.land_title_requests
      WHERE status IN ('pending','in_review')
    ),
    'permits', (
      SELECT COUNT(*) FROM public.cadastral_contributions
      WHERE permit_request_data IS NOT NULL AND status = 'pending'
    ),
    'mutations', (
      SELECT COUNT(*) FROM public.mutation_requests
      WHERE status = 'pending'
    ),
    'expertise', (
      SELECT COUNT(*) FROM public.real_estate_expertise_requests
      WHERE status = 'pending'
    ),
    'subdivisions', (
      SELECT COUNT(*) FROM public.subdivision_requests
      WHERE status = 'pending'
    ),
    -- payments = somme de toutes les sources de paiement « pending »
    'payments', (
        (SELECT COUNT(*) FROM public.payments WHERE status = 'pending')
      + (SELECT COUNT(*) FROM public.payment_transactions WHERE status = 'pending')
      + (SELECT COUNT(*) FROM public.expertise_payments WHERE status = 'pending')
      + (SELECT COUNT(*) FROM public.permit_payments WHERE status = 'pending')
      + (SELECT COUNT(*) FROM public.cadastral_invoices WHERE status = 'pending')
    ),
    'disputes', (
      SELECT COUNT(*) FROM public.cadastral_land_disputes
      WHERE current_status IN ('pending','under_investigation')
    ),
    'mortgages', (
      SELECT COUNT(*) FROM public.cadastral_mortgages
      WHERE mortgage_status = 'pending'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- ---------------------------------------------------------------------
-- 2) RPC transactionnelle de bulk update de prix (B6)
--    Accepte la table cible, le pourcentage, l'opération et inscrit
--    une seule ligne d'audit récapitulative.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_update_service_prices(
  p_table text,
  p_operation text,        -- 'increase' | 'decrease'
  p_percentage numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_multiplier numeric;
  v_count int := 0;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::app_role)
             OR public.has_role(v_uid, 'super_admin'::app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_percentage IS NULL OR p_percentage <= 0 OR p_percentage > 100 THEN
    RAISE EXCEPTION 'Invalid percentage (must be 0 < p <= 100)';
  END IF;

  v_multiplier := CASE
    WHEN p_operation = 'increase' THEN 1 + p_percentage / 100.0
    WHEN p_operation = 'decrease' THEN 1 - p_percentage / 100.0
    ELSE NULL
  END;

  IF v_multiplier IS NULL THEN
    RAISE EXCEPTION 'Invalid operation (use increase|decrease)';
  END IF;

  IF p_table = 'publications' THEN
    SELECT jsonb_agg(jsonb_build_object('id', id, 'price_usd', price_usd))
      INTO v_old FROM public.publications WHERE deleted_at IS NULL;
    UPDATE public.publications
       SET price_usd = GREATEST(0, price_usd * v_multiplier),
           updated_at = now()
     WHERE deleted_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    SELECT jsonb_agg(jsonb_build_object('id', id, 'price_usd', price_usd))
      INTO v_new FROM public.publications WHERE deleted_at IS NULL;

  ELSIF p_table = 'cadastral_services_config' THEN
    SELECT jsonb_agg(jsonb_build_object('id', id, 'price_usd', price_usd))
      INTO v_old FROM public.cadastral_services_config WHERE deleted_at IS NULL;
    UPDATE public.cadastral_services_config
       SET price_usd = GREATEST(0, price_usd * v_multiplier),
           updated_at = now()
     WHERE deleted_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    SELECT jsonb_agg(jsonb_build_object('id', id, 'price_usd', price_usd))
      INTO v_new FROM public.cadastral_services_config WHERE deleted_at IS NULL;

  ELSIF p_table = 'permit_fees_config' THEN
    SELECT jsonb_agg(jsonb_build_object('id', id, 'amount_usd', amount_usd))
      INTO v_old FROM public.permit_fees_config;
    UPDATE public.permit_fees_config
       SET amount_usd = GREATEST(0, amount_usd * v_multiplier),
           updated_at = now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    SELECT jsonb_agg(jsonb_build_object('id', id, 'amount_usd', amount_usd))
      INTO v_new FROM public.permit_fees_config;

  ELSE
    RAISE EXCEPTION 'Unsupported table %', p_table;
  END IF;

  -- Audit log unique
  INSERT INTO public.billing_config_audit (
    admin_id, admin_name, action, table_name, old_values, new_values
  ) VALUES (
    v_uid,
    (SELECT email FROM public.profiles WHERE user_id = v_uid LIMIT 1),
    'bulk_price_' || p_operation,
    p_table,
    jsonb_build_object('rows', v_old, 'percentage', p_percentage),
    jsonb_build_object('rows', v_new, 'percentage', p_percentage)
  );

  RETURN jsonb_build_object('updated_count', v_count, 'operation', p_operation, 'percentage', p_percentage);
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_update_service_prices(text, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_service_prices(text, text, numeric) TO authenticated;

-- ---------------------------------------------------------------------
-- 3) Vue SQL `unified_payments_view` — source unique pour Transactions
--    Couvre 6 sources : factures cadastre, payment_transactions,
--    expertise_payments, permit_payments, payments (publications),
--    plus les statuts de paiement des demandes mutation/titre.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.unified_payments_view
WITH (security_invoker = true)
AS
  SELECT
    'cadastral_invoice'::text                    AS source,
    ci.id                                        AS source_id,
    ci.invoice_number                            AS reference,
    ci.total_amount_usd                          AS amount_usd,
    ci.status,
    ci.payment_method,
    ci.user_id,
    ci.client_email                              AS user_label,
    ci.created_at
  FROM public.cadastral_invoices ci

  UNION ALL
  SELECT
    'payment_transaction', pt.id,
    COALESCE(pt.transaction_reference, pt.id::text),
    pt.amount_usd, pt.status, pt.payment_method,
    pt.user_id, pt.phone_number, pt.created_at
  FROM public.payment_transactions pt

  UNION ALL
  SELECT
    'expertise_payment', ep.id,
    COALESCE(ep.transaction_id, ep.id::text),
    ep.total_amount_usd, ep.status, ep.payment_method,
    ep.user_id, NULL, ep.created_at
  FROM public.expertise_payments ep

  UNION ALL
  SELECT
    'permit_payment', pp.id,
    COALESCE(pp.transaction_id, pp.id::text),
    pp.total_amount_usd, pp.status, pp.payment_method,
    pp.user_id, NULL, pp.created_at
  FROM public.permit_payments pp

  UNION ALL
  SELECT
    'publication_payment', p.id,
    COALESCE(p.transaction_id, p.id::text),
    p.amount_usd, p.status, p.payment_method,
    p.user_id, NULL, p.created_at
  FROM public.payments p

  UNION ALL
  SELECT
    'mutation_request', mr.id,
    COALESCE(mr.reference_number, mr.id::text),
    0::numeric, COALESCE(mr.payment_status, 'pending'), NULL,
    mr.user_id, NULL, mr.created_at
  FROM public.mutation_requests mr

  UNION ALL
  SELECT
    'land_title_request', lt.id,
    COALESCE(lt.reference_number, lt.id::text),
    0::numeric, COALESCE(lt.payment_status, 'pending'), NULL,
    lt.user_id, lt.requester_email, lt.created_at
  FROM public.land_title_requests lt;

GRANT SELECT ON public.unified_payments_view TO authenticated;

-- ---------------------------------------------------------------------
-- 4) Table billing_anomaly_resolutions (B9) — marquer comme résolu
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_anomaly_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type text NOT NULL,
  ref_id uuid NOT NULL,
  resolved_by uuid,
  resolved_by_name text,
  resolution_note text,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anomaly_type, ref_id)
);

ALTER TABLE public.billing_anomaly_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read anomaly resolutions"
  ON public.billing_anomaly_resolutions;
CREATE POLICY "Admins read anomaly resolutions"
  ON public.billing_anomaly_resolutions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins insert anomaly resolutions"
  ON public.billing_anomaly_resolutions;
CREATE POLICY "Admins insert anomaly resolutions"
  ON public.billing_anomaly_resolutions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role));
