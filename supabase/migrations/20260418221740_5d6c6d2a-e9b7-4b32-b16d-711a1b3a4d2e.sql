
-- =========================================
-- LOT 1 — Sécurité RLS super_admin
-- =========================================

-- profiles: SELECT all
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- profiles: UPDATE all
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- fraud_attempts: SELECT
DROP POLICY IF EXISTS "Only admins can view fraud attempts" ON public.fraud_attempts;
CREATE POLICY "Admins can view fraud attempts"
ON public.fraud_attempts FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- =========================================
-- LOT 1 — RPC: log PII export
-- =========================================
CREATE OR REPLACE FUNCTION public.log_pii_export(
  _table_name text,
  _row_count integer,
  _filters jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_name text;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT full_name INTO _admin_name FROM public.profiles WHERE user_id = auth.uid();

  INSERT INTO public.audit_logs (action, table_name, user_id, admin_name, new_values)
  VALUES (
    'PII_EXPORT',
    _table_name,
    auth.uid(),
    _admin_name,
    jsonb_build_object('row_count', _row_count, 'filters', _filters, 'exported_at', now())
  );
END;
$$;

-- =========================================
-- LOT 3 — RPC: utilisateurs inactifs
-- =========================================
CREATE OR REPLACE FUNCTION public.get_inactive_users(_threshold_days integer DEFAULT 90)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  last_activity timestamptz,
  days_inactive integer,
  is_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.email,
    p.full_name,
    GREATEST(
      COALESCE((SELECT MAX(created_at) FROM public.user_activity_logs WHERE user_activity_logs.user_id = p.user_id), p.created_at),
      p.created_at
    ) AS last_activity,
    EXTRACT(DAY FROM (now() - GREATEST(
      COALESCE((SELECT MAX(created_at) FROM public.user_activity_logs WHERE user_activity_logs.user_id = p.user_id), p.created_at),
      p.created_at
    )))::integer AS days_inactive,
    COALESCE(p.is_blocked, false) AS is_blocked
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND GREATEST(
      COALESCE((SELECT MAX(created_at) FROM public.user_activity_logs WHERE user_activity_logs.user_id = p.user_id), p.created_at),
      p.created_at
    ) < now() - (_threshold_days || ' days')::interval
  ORDER BY last_activity ASC;
END;
$$;

-- =========================================
-- Indexes utiles (P2)
-- =========================================
CREATE INDEX IF NOT EXISTS idx_fraud_attempts_severity_created
  ON public.fraud_attempts (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created
  ON public.user_activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON public.audit_logs (table_name, record_id, created_at DESC);
