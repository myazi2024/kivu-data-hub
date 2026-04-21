DROP VIEW IF EXISTS public.passthrough_billing_summary;
CREATE VIEW public.passthrough_billing_summary
WITH (security_invoker = on) AS
SELECT
  date_trunc('month', period_start)::date AS month,
  count(*) FILTER (WHERE status NOT IN ('cancelled')) AS invoice_count,
  count(*) FILTER (WHERE status = 'draft') AS draft_count,
  count(*) FILTER (WHERE status = 'validated') AS validated_count,
  count(*) FILTER (WHERE status = 'sent') AS sent_count,
  count(*) FILTER (WHERE status = 'paid') AS paid_count,
  count(*) FILTER (WHERE consistency_check_passed = false) AS inconsistent_count,
  COALESCE(sum(total_provider_fees_usd) FILTER (WHERE status NOT IN ('cancelled')), 0) AS total_fees_usd,
  COALESCE(sum(markup_amount_usd) FILTER (WHERE status NOT IN ('cancelled')), 0) AS total_markup_usd,
  COALESCE(sum(total_billed_usd) FILTER (WHERE status NOT IN ('cancelled')), 0) AS total_billed_usd
FROM public.passthrough_invoices
WHERE period_start >= (now() - interval '12 months')::date
GROUP BY 1
ORDER BY 1 DESC;