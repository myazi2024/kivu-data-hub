-- Lot 2: Provider fees tracking

-- 1. Add fee columns to payment_transactions
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS provider_fee_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_fee_currency text,
  ADD COLUMN IF NOT EXISTS provider_fee_raw jsonb;

-- net_amount_usd as generated column
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS net_amount_usd numeric
  GENERATED ALWAYS AS (amount_usd - COALESCE(provider_fee_usd, 0)) STORED;

-- 2. Add fee config columns to payment_methods_config
ALTER TABLE public.payment_methods_config
  ADD COLUMN IF NOT EXISTS fee_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_fixed_usd numeric NOT NULL DEFAULT 0;

-- 3. Preseed standard fees
UPDATE public.payment_methods_config
  SET fee_percent = 2.9, fee_fixed_usd = 0.30
  WHERE provider_id = 'stripe' AND fee_percent = 0 AND fee_fixed_usd = 0;

UPDATE public.payment_methods_config
  SET fee_percent = 1.5, fee_fixed_usd = 0
  WHERE config_type = 'mobile_money'
    AND provider_id IN ('mpesa', 'orange_money', 'airtel_money')
    AND fee_percent = 0 AND fee_fixed_usd = 0;

-- 4. RPC backfill_provider_fees
CREATE OR REPLACE FUNCTION public.backfill_provider_fees(
  p_from timestamptz DEFAULT (now() - interval '1 year'),
  p_to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count int := 0;
  v_total_fees numeric := 0;
  v_caller uuid := auth.uid();
BEGIN
  IF NOT (has_role(v_caller, 'admin') OR has_role(v_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  WITH updated AS (
    UPDATE public.payment_transactions pt
    SET
      provider_fee_usd = ROUND(
        (pt.amount_usd * COALESCE(pmc.fee_percent, 0) / 100.0)
        + COALESCE(pmc.fee_fixed_usd, 0)
      , 4),
      provider_fee_currency = 'USD',
      provider_fee_raw = jsonb_build_object(
        'source', 'backfill_estimate',
        'fee_percent', pmc.fee_percent,
        'fee_fixed_usd', pmc.fee_fixed_usd,
        'computed_at', now()
      )
    FROM public.payment_methods_config pmc
    WHERE pt.provider = pmc.provider_id
      AND pt.status = 'completed'
      AND pt.provider_fee_usd = 0
      AND pt.created_at BETWEEN p_from AND p_to
    RETURNING pt.id, pt.provider_fee_usd
  )
  SELECT COUNT(*), COALESCE(SUM(provider_fee_usd), 0)
  INTO v_updated_count, v_total_fees
  FROM updated;

  -- Audit
  INSERT INTO public.audit_logs (action, user_id, table_name, new_values)
  VALUES (
    'BACKFILL_PROVIDER_FEES',
    v_caller,
    'payment_transactions',
    jsonb_build_object(
      'period_from', p_from,
      'period_to', p_to,
      'updated_count', v_updated_count,
      'total_fees_estimated_usd', v_total_fees
    )
  );

  RETURN jsonb_build_object(
    'updated_count', v_updated_count,
    'total_fees_estimated_usd', v_total_fees
  );
END;
$$;

-- 5. View revenue_net_by_period
CREATE OR REPLACE VIEW public.revenue_net_by_period AS
SELECT
  date_trunc('month', created_at)::date AS period_month,
  provider,
  COUNT(*)::int AS transaction_count,
  COALESCE(SUM(amount_usd), 0) AS gross_revenue_usd,
  COALESCE(SUM(provider_fee_usd), 0) AS total_fees_usd,
  COALESCE(SUM(net_amount_usd), 0) AS net_revenue_usd,
  CASE WHEN SUM(amount_usd) > 0
    THEN ROUND((SUM(provider_fee_usd) / SUM(amount_usd) * 100)::numeric, 2)
    ELSE 0
  END AS effective_fee_percent
FROM public.payment_transactions
WHERE status = 'completed'
GROUP BY date_trunc('month', created_at), provider
ORDER BY period_month DESC, provider;

-- Grant select on view to authenticated; admin RLS enforced via underlying table
GRANT SELECT ON public.revenue_net_by_period TO authenticated;
