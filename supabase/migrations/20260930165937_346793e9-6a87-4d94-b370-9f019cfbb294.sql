-- Vues sans données personnelles pour les statistiques
CREATE OR REPLACE VIEW public.cadastral_ownership_history_stats AS
  SELECT id, parcel_id, legal_status, mutation_type, ownership_start_date, ownership_end_date, created_at
  FROM public.cadastral_ownership_history;
CREATE OR REPLACE VIEW public.cadastral_tax_history_stats AS
  SELECT id, parcel_id, tax_year, payment_status, amount_usd, payment_date, created_at
  FROM public.cadastral_tax_history;
REVOKE ALL ON public.cadastral_ownership_history_stats, public.cadastral_tax_history_stats FROM anon, PUBLIC;
GRANT SELECT ON public.cadastral_ownership_history_stats, public.cadastral_tax_history_stats TO authenticated, service_role;

-- Fin de la lecture libre des tables détaillées
DROP POLICY IF EXISTS "Authenticated users can view ownership history" ON public.cadastral_ownership_history;
DROP POLICY IF EXISTS "Authenticated users can view tax history" ON public.cadastral_tax_history;

-- Lecture détaillée après paiement
CREATE OR REPLACE FUNCTION public.get_parcel_paid_history(p_parcel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_num text;
  v_admin boolean;
  v_own boolean;
  v_tax boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT parcel_number INTO v_num FROM cadastral_parcels WHERE id = p_parcel_id;
  IF v_num IS NULL THEN RETURN jsonb_build_object('ownership_history','[]'::jsonb,'tax_history','[]'::jsonb); END IF;
  v_admin := has_any_role(v_uid, ARRAY['admin'::app_role,'super_admin'::app_role]);
  v_own := v_admin OR EXISTS (SELECT 1 FROM cadastral_service_access
    WHERE user_id = v_uid AND parcel_number = v_num AND service_type = 'history'
      AND (expires_at IS NULL OR expires_at > now()));
  v_tax := v_admin OR EXISTS (SELECT 1 FROM cadastral_service_access
    WHERE user_id = v_uid AND parcel_number = v_num AND service_type = 'obligations'
      AND (expires_at IS NULL OR expires_at > now()));
  RETURN jsonb_build_object(
    'ownership_history', CASE WHEN v_own THEN COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.ownership_start_date) FROM cadastral_ownership_history o WHERE o.parcel_id = p_parcel_id), '[]'::jsonb) ELSE '[]'::jsonb END,
    'tax_history', CASE WHEN v_tax THEN COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.tax_year) FROM cadastral_tax_history t WHERE t.parcel_id = p_parcel_id), '[]'::jsonb) ELSE '[]'::jsonb END
  );
END $$;
REVOKE ALL ON FUNCTION public.get_parcel_paid_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_parcel_paid_history(uuid) TO authenticated, service_role;