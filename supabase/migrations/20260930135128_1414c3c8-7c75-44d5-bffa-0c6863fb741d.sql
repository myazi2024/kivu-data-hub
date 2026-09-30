CREATE OR REPLACE FUNCTION public.get_home_district_activity_counts()
RETURNS TABLE(land_district text, services_count bigint, disputes_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH delivered AS (
    SELECT p.land_district, count(*) AS total
    FROM public.cadastral_service_access a
    JOIN public.cadastral_invoices i ON i.id = a.invoice_id
    JOIN public.cadastral_parcels p ON p.parcel_number = a.parcel_number
    WHERE i.status = 'paid'
      AND p.deleted_at IS NULL
      AND p.land_district IS NOT NULL AND btrim(p.land_district) <> ''
      AND p.parcel_number NOT ILIKE 'TEST-%'
      AND a.parcel_number NOT ILIKE 'TEST-%'
      AND i.parcel_number NOT ILIKE 'TEST-%'
    GROUP BY p.land_district
  ), disputes AS (
    SELECT p.land_district, count(*) AS total
    FROM public.cadastral_land_disputes d
    JOIN public.cadastral_parcels p ON p.parcel_number = d.parcel_number
    WHERE p.deleted_at IS NULL
      AND p.land_district IS NOT NULL AND btrim(p.land_district) <> ''
      AND p.parcel_number NOT ILIKE 'TEST-%'
      AND d.parcel_number NOT ILIKE 'TEST-%'
    GROUP BY p.land_district
  )
  SELECT COALESCE(delivered.land_district, disputes.land_district),
    COALESCE(delivered.total, 0), COALESCE(disputes.total, 0)
  FROM delivered FULL OUTER JOIN disputes USING (land_district);
$$;
REVOKE ALL ON FUNCTION public.get_home_district_activity_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_home_district_activity_counts() TO service_role;