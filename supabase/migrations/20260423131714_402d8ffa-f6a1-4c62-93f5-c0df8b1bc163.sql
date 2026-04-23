CREATE OR REPLACE FUNCTION public.get_user_statistics(target_user_id uuid, start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), end_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  -- Autoriser : le user lui-même, OU un admin, OU un super_admin
  IF auth.uid() != target_user_id
     AND NOT public.has_role(auth.uid(), 'super_admin')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé: vous ne pouvez consulter que vos propres statistiques';
  END IF;

  SELECT jsonb_build_object(
    'total_invoices', (
      SELECT COUNT(*) FROM public.cadastral_invoices 
      WHERE user_id = target_user_id AND created_at BETWEEN start_date AND end_date
    ),
    'total_spent', (
      SELECT COALESCE(SUM(total_amount_usd), 0) 
      FROM public.cadastral_invoices 
      WHERE user_id = target_user_id AND status = 'paid' AND created_at BETWEEN start_date AND end_date
    ),
    'pending_invoices', (
      SELECT COUNT(*) FROM public.cadastral_invoices 
      WHERE user_id = target_user_id AND status = 'pending' AND created_at BETWEEN start_date AND end_date
    ),
    'services_accessed', (
      SELECT COUNT(DISTINCT service_type) 
      FROM public.cadastral_service_access 
      WHERE user_id = target_user_id AND created_at BETWEEN start_date AND end_date
    ),
    'contributions_count', (
      SELECT COUNT(*) FROM public.cadastral_contributions 
      WHERE user_id = target_user_id AND created_at BETWEEN start_date AND end_date
    ),
    'approved_contributions', (
      SELECT COUNT(*) FROM public.cadastral_contributions 
      WHERE user_id = target_user_id AND status = 'approved' AND created_at BETWEEN start_date AND end_date
    ),
    'ccc_codes_earned', (
      SELECT COUNT(*) FROM public.cadastral_contributor_codes 
      WHERE user_id = target_user_id AND created_at BETWEEN start_date AND end_date
    ),
    'ccc_value_earned', (
      SELECT COALESCE(SUM(value_usd), 0) 
      FROM public.cadastral_contributor_codes 
      WHERE user_id = target_user_id AND created_at BETWEEN start_date AND end_date
    ),
    'ccc_codes_used', (
      SELECT COUNT(*) FROM public.cadastral_contributor_codes 
      WHERE user_id = target_user_id AND is_used = true AND used_at BETWEEN start_date AND end_date
    )
  ) INTO result;

  RETURN result;
END;
$function$;