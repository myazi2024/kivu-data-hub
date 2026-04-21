CREATE OR REPLACE FUNCTION public.get_orphan_reseller_invoices_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.cadastral_invoices ci
  WHERE ci.status = 'paid'
    AND ci.discount_code_used IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.reseller_sales rs WHERE rs.invoice_id = ci.id
    );
$$;

REVOKE ALL ON FUNCTION public.get_orphan_reseller_invoices_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_orphan_reseller_invoices_count() TO authenticated;