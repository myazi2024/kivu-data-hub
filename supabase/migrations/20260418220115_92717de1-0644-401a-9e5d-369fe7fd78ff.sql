-- 1. Index pour accélérer les agrégations factures
CREATE INDEX IF NOT EXISTS cadastral_invoices_status_created_idx
  ON public.cadastral_invoices (status, created_at);

CREATE INDEX IF NOT EXISTS cadastral_invoices_real_status_created_idx
  ON public.cadastral_invoices (status, created_at)
  WHERE parcel_number NOT ILIKE 'TEST-%';

CREATE INDEX IF NOT EXISTS cadastral_contributions_status_created_idx
  ON public.cadastral_contributions (status, created_at);

-- 2. RPC get_admin_statistics : ajout du paramètre _exclude_test
CREATE OR REPLACE FUNCTION public.get_admin_statistics(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE,
  stat_type TEXT DEFAULT 'overview',
  _exclude_test BOOLEAN DEFAULT TRUE
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
  SELECT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]) INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Accès refusé: droits administrateur requis';
  END IF;

  IF stat_type = 'overview' THEN
    SELECT jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL),
      'new_users_period', (
        SELECT COUNT(*) FROM public.profiles
        WHERE deleted_at IS NULL AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
      ),
      'total_invoices', (
        SELECT COUNT(*) FROM public.cadastral_invoices
        WHERE created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'total_revenue', (
        SELECT COALESCE(SUM(total_amount_usd), 0)
        FROM public.cadastral_invoices
        WHERE status = 'paid'
          AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'pending_payments_count', (
        SELECT COUNT(*) FROM public.cadastral_invoices
        WHERE status = 'pending'
          AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'pending_payments_sum', (
        SELECT COALESCE(SUM(total_amount_usd), 0) FROM public.cadastral_invoices
        WHERE status = 'pending'
          AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'pending_payments', (
        SELECT COUNT(*) FROM public.cadastral_invoices
        WHERE status = 'pending'
          AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'total_contributions', (
        SELECT COUNT(*) FROM public.cadastral_contributions
        WHERE created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'approved_contributions', (
        SELECT COUNT(*) FROM public.cadastral_contributions
        WHERE status = 'approved'
          AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'total_resellers', (SELECT COUNT(*) FROM public.resellers WHERE is_active = true),
      'total_ccc_codes', (
        SELECT COUNT(*) FROM public.cadastral_contributor_codes
        WHERE created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'active_ccc_codes', (
        SELECT COUNT(*) FROM public.cadastral_contributor_codes
        WHERE is_used = false AND expires_at > now()
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      ),
      'used_ccc_codes', (
        SELECT COUNT(*) FROM public.cadastral_contributor_codes
        WHERE is_used = true
          AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      )
    ) INTO result;

  ELSIF stat_type = 'revenue_by_day' THEN
    SELECT jsonb_agg(
      jsonb_build_object('date', day::DATE, 'revenue', COALESCE(revenue, 0), 'count', COALESCE(invoice_count, 0))
      ORDER BY day
    )
    INTO result
    FROM (
      SELECT
        DATE_TRUNC('day', d.day) AS day,
        COALESCE(SUM(ci.total_amount_usd), 0) AS revenue,
        COUNT(ci.id) AS invoice_count
      FROM generate_series(start_date::TIMESTAMP, end_date::TIMESTAMP, '1 day'::INTERVAL) d(day)
      LEFT JOIN public.cadastral_invoices ci
        ON DATE_TRUNC('day', ci.created_at) = DATE_TRUNC('day', d.day)
        AND ci.status = 'paid'
        AND (NOT _exclude_test OR ci.parcel_number NOT ILIKE 'TEST-%')
      GROUP BY DATE_TRUNC('day', d.day)
    ) daily_stats;

  ELSIF stat_type = 'services_usage' THEN
    SELECT jsonb_agg(
      jsonb_build_object('service_id', service_id, 'service_name', service_name, 'count', usage_count, 'revenue', total_revenue)
      ORDER BY usage_count DESC
    )
    INTO result
    FROM (
      SELECT s.service_id, s.name AS service_name, COUNT(sa.id) AS usage_count, COALESCE(SUM(s.price_usd), 0) AS total_revenue
      FROM public.cadastral_services_config s
      LEFT JOIN public.cadastral_service_access sa ON sa.service_type = s.service_id
        AND sa.created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
        AND (NOT _exclude_test OR sa.parcel_number NOT ILIKE 'TEST-%')
      WHERE s.is_active = true
      GROUP BY s.service_id, s.name
    ) service_stats;

  ELSIF stat_type = 'user_growth' THEN
    SELECT jsonb_agg(
      jsonb_build_object('date', day::DATE, 'new_users', COALESCE(user_count, 0), 'cumulative', COALESCE(cumulative_count, 0))
      ORDER BY day
    )
    INTO result
    FROM (
      SELECT DATE_TRUNC('day', d.day) AS day,
             COUNT(p.id) AS user_count,
             SUM(COUNT(p.id)) OVER (ORDER BY DATE_TRUNC('day', d.day)) AS cumulative_count
      FROM generate_series(start_date::TIMESTAMP, end_date::TIMESTAMP, '1 day'::INTERVAL) d(day)
      LEFT JOIN public.profiles p ON DATE_TRUNC('day', p.created_at) = DATE_TRUNC('day', d.day) AND p.deleted_at IS NULL
      GROUP BY DATE_TRUNC('day', d.day)
    ) growth_stats;

  ELSIF stat_type = 'contributions_status' THEN
    SELECT jsonb_build_object(
      'pending', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE status = 'pending' AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day' AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')),
      'approved', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE status = 'approved' AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day' AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')),
      'rejected', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE status = 'rejected' AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day' AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')),
      'suspicious', (SELECT COUNT(*) FROM public.cadastral_contributions WHERE is_suspicious = true AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day' AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%'))
    ) INTO result;

  ELSIF stat_type = 'payment_methods' THEN
    SELECT jsonb_agg(jsonb_build_object('method', COALESCE(payment_method, 'Non spécifié'), 'count', payment_count, 'total', total_amount))
    INTO result
    FROM (
      SELECT payment_method, COUNT(*) AS payment_count, COALESCE(SUM(total_amount_usd), 0) AS total_amount
      FROM public.cadastral_invoices
      WHERE status = 'paid' AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
        AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
      GROUP BY payment_method
    ) payment_stats;

  ELSIF stat_type = 'reseller_performance' THEN
    SELECT jsonb_agg(
      jsonb_build_object('reseller_code', r.reseller_code, 'business_name', r.business_name,
        'total_sales', COALESCE(stats.total_sales, 0), 'sales_count', COALESCE(stats.sales_count, 0),
        'commission_earned', COALESCE(stats.commission_earned, 0))
      ORDER BY stats.total_sales DESC NULLS LAST
    )
    INTO result
    FROM public.resellers r
    LEFT JOIN (
      SELECT reseller_id, SUM(sale_amount_usd) AS total_sales, COUNT(*) AS sales_count, SUM(commission_earned_usd) AS commission_earned
      FROM public.reseller_sales
      WHERE created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
      GROUP BY reseller_id
    ) stats ON stats.reseller_id = r.id
    WHERE r.is_active = true;

  ELSE
    result := jsonb_build_object('error', 'Type de statistique inconnu');
  END IF;

  RETURN result;
END;
$$;

-- 3. RPC consolidée get_admin_dashboard_full
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_full(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE,
  prev_start DATE DEFAULT CURRENT_DATE - INTERVAL '60 days',
  prev_end DATE DEFAULT CURRENT_DATE - INTERVAL '31 days',
  _exclude_test BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
  is_admin BOOLEAN;
  v_overdue_days INT := 7;
  v_inactive_days INT := 30;
BEGIN
  SELECT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]) INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Accès refusé: droits administrateur requis';
  END IF;

  -- Lire seuils depuis system_settings (avec fallback)
  BEGIN
    SELECT COALESCE((setting_value)::int, 7) INTO v_overdue_days
    FROM public.system_settings WHERE setting_key = 'alert_overdue_days';
  EXCEPTION WHEN OTHERS THEN v_overdue_days := 7; END;

  BEGIN
    SELECT COALESCE((setting_value)::int, 30) INTO v_inactive_days
    FROM public.system_settings WHERE setting_key = 'alert_inactive_reseller_days';
  EXCEPTION WHEN OTHERS THEN v_inactive_days := 30; END;

  WITH
    period_inv AS (
      SELECT * FROM public.cadastral_invoices
      WHERE created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
        AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
    ),
    prev_inv AS (
      SELECT * FROM public.cadastral_invoices
      WHERE created_at BETWEEN prev_start AND prev_end + INTERVAL '1 day'
        AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
    ),
    period_contrib AS (
      SELECT * FROM public.cadastral_contributions
      WHERE created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
        AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')
    )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL),
      'new_users_period', (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL AND created_at BETWEEN start_date AND end_date + INTERVAL '1 day'),
      'new_users_prev', (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL AND created_at BETWEEN prev_start AND prev_end + INTERVAL '1 day'),
      'total_invoices', (SELECT COUNT(*) FROM period_inv),
      'total_invoices_prev', (SELECT COUNT(*) FROM prev_inv),
      'total_revenue', (SELECT COALESCE(SUM(total_amount_usd), 0) FROM period_inv WHERE status = 'paid'),
      'total_revenue_prev', (SELECT COALESCE(SUM(total_amount_usd), 0) FROM prev_inv WHERE status = 'paid'),
      'paid_invoices', (SELECT COUNT(*) FROM period_inv WHERE status = 'paid'),
      'pending_payments_count', (SELECT COUNT(*) FROM period_inv WHERE status = 'pending'),
      'pending_payments_sum', (SELECT COALESCE(SUM(total_amount_usd), 0) FROM period_inv WHERE status = 'pending'),
      'pending_payments_count_prev', (SELECT COUNT(*) FROM prev_inv WHERE status = 'pending'),
      'failed_payments', (SELECT COUNT(*) FROM period_inv WHERE status = 'failed'),
      'total_contributions', (SELECT COUNT(*) FROM period_contrib),
      'approved_contributions', (SELECT COUNT(*) FROM period_contrib WHERE status = 'approved'),
      'overdue_contributions', (SELECT COUNT(*) FROM period_contrib WHERE status = 'pending' AND created_at < now() - (v_overdue_days || ' days')::interval),
      'active_ccc_codes', (SELECT COUNT(*) FROM public.cadastral_contributor_codes WHERE is_used = false AND expires_at > now() AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')),
      'used_ccc_codes', (SELECT COUNT(*) FROM public.cadastral_contributor_codes WHERE is_used = true AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')),
      'expired_ccc_codes', (SELECT COUNT(*) FROM public.cadastral_contributor_codes WHERE is_used = false AND expires_at <= now() AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%'))
    ),
    'alerts', jsonb_build_object(
      'overdue_contributions', (SELECT COUNT(*) FROM period_contrib WHERE status = 'pending' AND created_at < now() - (v_overdue_days || ' days')::interval),
      'failed_payments', (SELECT COUNT(*) FROM period_inv WHERE status = 'failed'),
      'blocked_users', (SELECT COUNT(*) FROM public.profiles WHERE is_blocked = true),
      'expired_codes', (SELECT COUNT(*) FROM public.cadastral_contributor_codes WHERE is_used = false AND expires_at <= now() AND (NOT _exclude_test OR parcel_number NOT ILIKE 'TEST-%')),
      'inactive_resellers', (
        SELECT COUNT(*) FROM public.resellers r
        WHERE r.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM public.reseller_sales rs
            WHERE rs.reseller_id = r.id AND rs.created_at >= now() - (v_inactive_days || ' days')::interval
          )
      ),
      'pending_disputes', (SELECT COUNT(*) FROM public.cadastral_land_disputes WHERE current_status IN ('pending', 'under_investigation')),
      'pending_mortgages', (SELECT COUNT(*) FROM public.cadastral_mortgages WHERE mortgage_status = 'pending'),
      'thresholds', jsonb_build_object('overdue_days', v_overdue_days, 'inactive_days', v_inactive_days)
    ),
    'top_users', (
      SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'name_masked', name_masked, 'value', total) ORDER BY total DESC)
      FROM (
        SELECT pi.user_id,
          CASE
            WHEN p.full_name IS NOT NULL AND length(p.full_name) > 0 THEN p.full_name
            ELSE regexp_replace(COALESCE(pi.client_email, ''), '^(.).*@(.+)$', '\1***@\2')
          END AS name_masked,
          SUM(pi.total_amount_usd) AS total
        FROM period_inv pi
        LEFT JOIN public.profiles p ON p.id = pi.user_id
        WHERE pi.user_id IS NOT NULL AND pi.status = 'paid'
        GROUP BY pi.user_id, p.full_name, pi.client_email
        ORDER BY total DESC
        LIMIT 5
      ) t
    ),
    'top_resellers', (
      SELECT jsonb_agg(jsonb_build_object('id', reseller_id, 'name', business_name, 'value', total) ORDER BY total DESC)
      FROM (
        SELECT rs.reseller_id, r.business_name, SUM(rs.sale_amount_usd) AS total
        FROM public.reseller_sales rs
        JOIN public.resellers r ON r.id = rs.reseller_id
        WHERE rs.created_at BETWEEN start_date AND end_date + INTERVAL '1 day'
        GROUP BY rs.reseller_id, r.business_name
        ORDER BY total DESC
        LIMIT 5
      ) t
    ),
    'top_zones', (
      SELECT jsonb_agg(jsonb_build_object('name', province, 'value', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT province, COUNT(*) AS cnt FROM period_contrib
        WHERE province IS NOT NULL
        GROUP BY province ORDER BY cnt DESC LIMIT 5
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_full TO authenticated;

-- 4. Seuils d'alertes par défaut dans system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('alert_overdue_days', '7'::jsonb, 'Nombre de jours avant qu''une contribution en attente soit considérée en retard'),
  ('alert_inactive_reseller_days', '30'::jsonb, 'Nombre de jours sans vente avant qu''un revendeur soit considéré inactif'),
  ('alert_fraud_rate_pct', '5'::jsonb, 'Taux de fraude (%) au-delà duquel une alerte est levée'),
  ('alert_validation_hours', '48'::jsonb, 'Délai moyen de validation (h) au-delà duquel une alerte est levée'),
  ('dashboard_exclude_test_default', 'true'::jsonb, 'Exclure par défaut les données de test (TEST-%) du dashboard admin')
ON CONFLICT (setting_key) DO NOTHING;