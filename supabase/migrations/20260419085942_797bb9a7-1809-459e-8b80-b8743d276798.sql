CREATE OR REPLACE FUNCTION public.get_admin_pending_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    'payments', (
      SELECT COUNT(*) FROM public.payments
      WHERE status = 'pending'
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
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_pending_counts() TO authenticated;