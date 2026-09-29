CREATE OR REPLACE FUNCTION public.get_home_bic_counts()
RETURNS TABLE(parcels_count bigint, services_count bigint, disputes_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.cadastral_parcels p
      WHERE p.deleted_at IS NULL AND p.parcel_number NOT ILIKE 'TEST-%'),
    (SELECT count(*) FROM public.cadastral_service_access a
      JOIN public.cadastral_invoices i ON i.id = a.invoice_id
      WHERE i.status = 'paid' AND a.parcel_number NOT ILIKE 'TEST-%'
        AND i.parcel_number NOT ILIKE 'TEST-%'),
    (SELECT count(*) FROM public.cadastral_land_disputes d
      WHERE d.parcel_number NOT ILIKE 'TEST-%');
$$;
REVOKE ALL ON FUNCTION public.get_home_bic_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_home_bic_counts() TO anon, authenticated, service_role;