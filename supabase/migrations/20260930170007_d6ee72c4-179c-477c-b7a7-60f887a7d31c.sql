DROP VIEW IF EXISTS public.cadastral_ownership_history_stats;
DROP VIEW IF EXISTS public.cadastral_tax_history_stats;

CREATE OR REPLACE FUNCTION public.get_ownership_history_stats()
RETURNS TABLE(id uuid, parcel_id uuid, legal_status text, mutation_type text, ownership_start_date date, ownership_end_date date, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.id, o.parcel_id, o.legal_status::text, o.mutation_type::text, o.ownership_start_date::date, o.ownership_end_date::date, o.created_at
  FROM cadastral_ownership_history o WHERE auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.get_tax_history_stats()
RETURNS TABLE(id uuid, parcel_id uuid, tax_year integer, payment_status text, amount_usd numeric, payment_date date, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.parcel_id, t.tax_year::integer, t.payment_status::text, t.amount_usd::numeric, t.payment_date::date, t.created_at
  FROM cadastral_tax_history t WHERE auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.get_ownership_history_stats(), public.get_tax_history_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ownership_history_stats(), public.get_tax_history_stats() TO authenticated, service_role;