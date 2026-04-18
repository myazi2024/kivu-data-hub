DROP VIEW IF EXISTS public.billing_anomalies;
CREATE VIEW public.billing_anomalies
WITH (security_invoker = true) AS
SELECT 'tx_completed_invoice_unpaid'::text AS anomaly_type,
       pt.id::text AS ref_id, pt.invoice_id::text AS related_id,
       pt.amount_usd AS amount, pt.created_at
  FROM public.payment_transactions pt
  JOIN public.cadastral_invoices ci ON ci.id = pt.invoice_id
 WHERE pt.status = 'completed' AND ci.status <> 'paid'
UNION ALL
SELECT 'discount_without_code', ci.id::text, NULL,
       ci.discount_amount_usd, ci.created_at
  FROM public.cadastral_invoices ci
 WHERE COALESCE(ci.discount_amount_usd,0) > 0
   AND (ci.discount_code_used IS NULL OR length(trim(ci.discount_code_used))=0)
UNION ALL
SELECT 'expired_active_discount_code', dc.id::text, NULL,
       NULL, dc.created_at
  FROM public.discount_codes dc
 WHERE dc.is_active = true AND dc.expires_at IS NOT NULL AND dc.expires_at < now();

REVOKE ALL ON public.billing_anomalies FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.billing_anomalies TO authenticated;