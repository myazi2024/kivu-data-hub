-- ============================================
-- FONCTIONS SÉCURISÉES POUR STATISTIQUES PAR RÔLE
-- ============================================

-- 1. Fonction pour les statistiques administrateurs (tous types)
CREATE OR REPLACE FUNCTION public.get_admin_statistics(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE,
  stat_type TEXT DEFAULT 'overview'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
  is_admin BOOLEAN;
BEGIN
  -- Vérifier les permissions admin
  SELECT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Accès refusé: droits administrateur requis';
  END IF;

  IF stat_type = 'overview' THEN
    -- Vue d'ensemble générale
    SELECT jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL),
      'total_invoices', (SELECT COUNT(*) FROM public.cadastral_invoices WHERE created_at BETWEEN start_date AND end_date),
      'total_revenue', (
        SELECT COALESCE(SUM(total_amount_usd), 0) 
        FROM public.cadastral_invoices 
        WHERE status = 'paid' AND created_at BETWEEN start_date AND end_date
      ),
      'pending_payments', (
        SELECT COALESCE(SUM(total_amount_usd), 0) 
        FROM public.cadastral_invoices 
        WHERE status = 'pending' AND created_at BETWEEN start_date AND end_date
      ),
      'total_contributions', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE created_at BETWEEN start_date AND end_date),
      'approved_contributions', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE status = 'approved' AND created_at BETWEEN start_date AND end_date),
      'total_resellers', (SELECT COUNT(*) FROM public.resellers WHERE is_active = true),
      'total_ccc_codes', (SELECT COUNT(*) FROM public.cadastral_contributor_codes WHERE created_at BETWEEN start_date AND end_date)
    ) INTO result;

  ELSIF stat_type = 'revenue_by_day' THEN
    -- Revenus par jour
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', day::DATE,
        'revenue', COALESCE(revenue, 0),
        'count', COALESCE(invoice_count, 0)
      ) ORDER BY day
    )
    INTO result
    FROM (
      SELECT 
        DATE_TRUNC('day', d.day) as day,
        COALESCE(SUM(ci.total_amount_usd), 0) as revenue,
        COUNT(ci.id) as invoice_count
      FROM generate_series(start_date::TIMESTAMP, end_date::TIMESTAMP, '1 day'::INTERVAL) d(day)
      LEFT JOIN public.cadastral_invoices ci ON DATE_TRUNC('day', ci.created_at) = DATE_TRUNC('day', d.day) AND ci.status = 'paid'
      GROUP BY DATE_TRUNC('day', d.day)
    ) daily_stats;

  ELSIF stat_type = 'services_usage' THEN
    -- Utilisation des services
    SELECT jsonb_agg(
      jsonb_build_object(
        'service_id', service_id,
        'service_name', service_name,
        'count', usage_count,
        'revenue', total_revenue
      ) ORDER BY usage_count DESC
    )
    INTO result
    FROM (
      SELECT 
        s.service_id,
        s.name as service_name,
        COUNT(sa.id) as usage_count,
        COALESCE(SUM(s.price_usd), 0) as total_revenue
      FROM public.cadastral_services_config s
      LEFT JOIN public.cadastral_service_access sa ON sa.service_type = s.service_id 
        AND sa.created_at BETWEEN start_date AND end_date
      WHERE s.is_active = true
      GROUP BY s.service_id, s.name
    ) service_stats;

  ELSIF stat_type = 'user_growth' THEN
    -- Croissance des utilisateurs
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', day::DATE,
        'new_users', COALESCE(user_count, 0),
        'cumulative', COALESCE(cumulative_count, 0)
      ) ORDER BY day
    )
    INTO result
    FROM (
      SELECT 
        DATE_TRUNC('day', d.day) as day,
        COUNT(p.id) as user_count,
        SUM(COUNT(p.id)) OVER (ORDER BY DATE_TRUNC('day', d.day)) as cumulative_count
      FROM generate_series(start_date::TIMESTAMP, end_date::TIMESTAMP, '1 day'::INTERVAL) d(day)
      LEFT JOIN public.profiles p ON DATE_TRUNC('day', p.created_at) = DATE_TRUNC('day', d.day)
      GROUP BY DATE_TRUNC('day', d.day)
    ) growth_stats;

  ELSIF stat_type = 'contributions_status' THEN
    -- Statut des contributions
    SELECT jsonb_build_object(
      'pending', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE status = 'pending' AND created_at BETWEEN start_date AND end_date),
      'approved', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE status = 'approved' AND created_at BETWEEN start_date AND end_date),
      'rejected', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE status = 'rejected' AND created_at BETWEEN start_date AND end_date),
      'suspicious', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE is_suspicious = true AND created_at BETWEEN start_date AND end_date)
    ) INTO result;

  ELSIF stat_type = 'payment_methods' THEN
    -- Méthodes de paiement
    SELECT jsonb_agg(
      jsonb_build_object(
        'method', COALESCE(payment_method, 'Non spécifié'),
        'count', payment_count,
        'total', total_amount
      )
    )
    INTO result
    FROM (
      SELECT 
        payment_method,
        COUNT(*) as payment_count,
        COALESCE(SUM(total_amount_usd), 0) as total_amount
      FROM public.cadastral_invoices
      WHERE status = 'paid' AND created_at BETWEEN start_date AND end_date
      GROUP BY payment_method
    ) payment_stats;

  ELSIF stat_type = 'reseller_performance' THEN
    -- Performance des revendeurs
    SELECT jsonb_agg(
      jsonb_build_object(
        'reseller_code', r.reseller_code,
        'business_name', r.business_name,
        'total_sales', COALESCE(stats.total_sales, 0),
        'sales_count', COALESCE(stats.sales_count, 0),
        'commission_earned', COALESCE(stats.commission_earned, 0)
      ) ORDER BY stats.total_sales DESC NULLS LAST
    )
    INTO result
    FROM public.resellers r
    LEFT JOIN (
      SELECT 
        reseller_id,
        SUM(sale_amount_usd) as total_sales,
        COUNT(*) as sales_count,
        SUM(commission_earned_usd) as commission_earned
      FROM public.reseller_sales
      WHERE created_at BETWEEN start_date AND end_date
      GROUP BY reseller_id
    ) stats ON stats.reseller_id = r.id
    WHERE r.is_active = true;

  ELSE
    result := jsonb_build_object('error', 'Type de statistique inconnu');
  END IF;

  RETURN result;
END;
$$;

-- 2. Fonction pour les statistiques revendeurs
CREATE OR REPLACE FUNCTION public.get_reseller_statistics(
  reseller_user_id UUID,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE,
  stat_type TEXT DEFAULT 'overview'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
  reseller_id_var UUID;
BEGIN
  -- Vérifier que l'utilisateur est bien un revendeur
  SELECT id INTO reseller_id_var 
  FROM public.resellers 
  WHERE user_id = reseller_user_id AND is_active = true;
  
  IF reseller_id_var IS NULL THEN
    RAISE EXCEPTION 'Accès refusé: utilisateur non revendeur';
  END IF;

  IF stat_type = 'overview' THEN
    -- Vue d'ensemble
    SELECT jsonb_build_object(
      'total_sales', COALESCE(SUM(sale_amount_usd), 0),
      'sales_count', COUNT(*),
      'total_commission', COALESCE(SUM(commission_earned_usd), 0),
      'paid_commission', COALESCE(SUM(CASE WHEN commission_paid THEN commission_earned_usd ELSE 0 END), 0),
      'pending_commission', COALESCE(SUM(CASE WHEN NOT commission_paid THEN commission_earned_usd ELSE 0 END), 0),
      'avg_sale_amount', COALESCE(AVG(sale_amount_usd), 0)
    )
    INTO result
    FROM public.reseller_sales
    WHERE reseller_id = reseller_id_var 
      AND created_at BETWEEN start_date AND end_date;

  ELSIF stat_type = 'sales_by_day' THEN
    -- Ventes par jour
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', day::DATE,
        'sales', COALESCE(sales_count, 0),
        'revenue', COALESCE(revenue, 0),
        'commission', COALESCE(commission, 0)
      ) ORDER BY day
    )
    INTO result
    FROM (
      SELECT 
        DATE_TRUNC('day', d.day) as day,
        COUNT(rs.id) as sales_count,
        COALESCE(SUM(rs.sale_amount_usd), 0) as revenue,
        COALESCE(SUM(rs.commission_earned_usd), 0) as commission
      FROM generate_series(start_date::TIMESTAMP, end_date::TIMESTAMP, '1 day'::INTERVAL) d(day)
      LEFT JOIN public.reseller_sales rs ON DATE_TRUNC('day', rs.created_at) = DATE_TRUNC('day', d.day) 
        AND rs.reseller_id = reseller_id_var
      GROUP BY DATE_TRUNC('day', d.day)
    ) daily_sales;

  ELSIF stat_type = 'discount_codes_performance' THEN
    -- Performance des codes de remise
    SELECT jsonb_agg(
      jsonb_build_object(
        'code', dc.code,
        'usage_count', dc.usage_count,
        'max_usage', dc.max_usage,
        'total_discount', COALESCE(total_discount, 0),
        'total_commission', COALESCE(total_commission, 0),
        'is_active', dc.is_active
      ) ORDER BY dc.usage_count DESC
    )
    INTO result
    FROM public.discount_codes dc
    LEFT JOIN (
      SELECT 
        discount_code_id,
        SUM(discount_applied_usd) as total_discount,
        SUM(commission_earned_usd) as total_commission
      FROM public.reseller_sales
      WHERE reseller_id = reseller_id_var 
        AND created_at BETWEEN start_date AND end_date
      GROUP BY discount_code_id
    ) sales_stats ON sales_stats.discount_code_id = dc.id
    WHERE dc.reseller_id = reseller_id_var;

  ELSE
    result := jsonb_build_object('error', 'Type de statistique inconnu');
  END IF;

  RETURN result;
END;
$$;

-- 3. Fonction pour les statistiques utilisateurs
CREATE OR REPLACE FUNCTION public.get_user_statistics(
  target_user_id UUID,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Vérifier que l'utilisateur consulte ses propres stats
  IF auth.uid() != target_user_id THEN
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
$$;

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION public.get_admin_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reseller_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_statistics TO authenticated;