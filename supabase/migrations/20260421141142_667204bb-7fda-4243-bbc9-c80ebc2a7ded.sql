
DROP VIEW IF EXISTS public.tva_collected_by_period;

CREATE VIEW public.tva_collected_by_period
WITH (security_invoker = true) AS
SELECT
  EXTRACT(YEAR FROM COALESCE(paid_at, created_at))::integer AS year,
  EXTRACT(MONTH FROM COALESCE(paid_at, created_at))::integer AS month,
  currency_code,
  COUNT(*) AS invoice_count,
  COALESCE(SUM(total_amount_usd), 0) AS total_ttc_usd,
  COALESCE(SUM(ROUND(total_amount_usd / 1.16, 2)), 0) AS total_ht_usd,
  COALESCE(SUM(ROUND(total_amount_usd - (total_amount_usd / 1.16), 2)), 0) AS tva_collected_usd
FROM public.cadastral_invoices
WHERE status = 'paid'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2 DESC;
