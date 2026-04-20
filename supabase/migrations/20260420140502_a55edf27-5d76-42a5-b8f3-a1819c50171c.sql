
-- RPC 1: Regenerate orphan reseller sales (paid cadastral_invoices with discount_code_used but no reseller_sales row)
CREATE OR REPLACE FUNCTION public.regenerate_orphan_reseller_sales()
RETURNS TABLE(inserted_count integer, scanned_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_scanned integer := 0;
  v_inv record;
  v_dc record;
  v_commission numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  FOR v_inv IN
    SELECT i.id, i.payment_id, i.total_amount_usd, i.discount_amount_usd, i.discount_code_used
    FROM public.cadastral_invoices i
    LEFT JOIN public.reseller_sales rs ON rs.invoice_id = i.id
    WHERE i.status = 'paid'
      AND i.discount_code_used IS NOT NULL
      AND rs.id IS NULL
  LOOP
    v_scanned := v_scanned + 1;
    SELECT dc.id, dc.reseller_id, r.commission_rate, r.fixed_commission_usd
      INTO v_dc
      FROM public.discount_codes dc
      JOIN public.resellers r ON r.id = dc.reseller_id
     WHERE dc.code = v_inv.discount_code_used
     LIMIT 1;
    IF FOUND THEN
      v_commission := COALESCE(v_dc.fixed_commission_usd,0)
                    + COALESCE(v_inv.total_amount_usd,0) * COALESCE(v_dc.commission_rate,0) / 100.0;
      INSERT INTO public.reseller_sales(reseller_id, invoice_id, payment_id, discount_code_id,
        sale_amount_usd, discount_applied_usd, commission_earned_usd)
      VALUES (v_dc.reseller_id, v_inv.id, v_inv.payment_id, v_dc.id,
        v_inv.total_amount_usd, COALESCE(v_inv.discount_amount_usd,0), v_commission);
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_scanned;
END;
$$;

-- RPC 2: Aggregate billing summary across all transaction sources within a date range
CREATE OR REPLACE FUNCTION public.get_billing_summary(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH unified AS (
    SELECT 'cadastral'::text AS source, status, amount_usd, payment_method, created_at
      FROM public.payment_transactions
      WHERE created_at >= p_from AND created_at < p_to
    UNION ALL
    SELECT 'expertise', status, total_amount_usd, payment_method, created_at
      FROM public.expertise_payments
      WHERE created_at >= p_from AND created_at < p_to
    UNION ALL
    SELECT 'permit', status, total_amount_usd, payment_method, created_at
      FROM public.permit_payments
      WHERE created_at >= p_from AND created_at < p_to
    UNION ALL
    SELECT 'publication', status, amount_usd, payment_method, created_at
      FROM public.payments
      WHERE created_at >= p_from AND created_at < p_to
  )
  SELECT jsonb_build_object(
    'total_transactions', count(*),
    'completed_count', count(*) FILTER (WHERE status IN ('completed','paid','success')),
    'failed_count', count(*) FILTER (WHERE status IN ('failed','cancelled','error')),
    'pending_count', count(*) FILTER (WHERE status IN ('pending','processing')),
    'total_revenue_usd', COALESCE(sum(amount_usd) FILTER (WHERE status IN ('completed','paid','success')),0),
    'pending_revenue_usd', COALESCE(sum(amount_usd) FILTER (WHERE status IN ('pending','processing')),0),
    'by_source', (
      SELECT jsonb_object_agg(source, jsonb_build_object('count', cnt, 'revenue', rev))
      FROM (
        SELECT source, count(*) AS cnt,
               COALESCE(sum(amount_usd) FILTER (WHERE status IN ('completed','paid','success')),0) AS rev
        FROM unified GROUP BY source
      ) s
    ),
    'by_method', (
      SELECT jsonb_object_agg(COALESCE(payment_method,'unknown'), jsonb_build_object('count', cnt, 'revenue', rev))
      FROM (
        SELECT payment_method, count(*) AS cnt,
               COALESCE(sum(amount_usd) FILTER (WHERE status IN ('completed','paid','success')),0) AS rev
        FROM unified GROUP BY payment_method
      ) m
    )
  ) INTO v_result FROM unified;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_orphan_reseller_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_summary(timestamptz, timestamptz) TO authenticated;
