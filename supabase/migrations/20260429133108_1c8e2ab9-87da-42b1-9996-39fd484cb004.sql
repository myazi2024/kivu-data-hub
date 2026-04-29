-- RPC: Historique des purges TEST (lit audit_logs)
CREATE OR REPLACE FUNCTION public.get_test_cleanup_history(p_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  action text,
  user_id uuid,
  created_at timestamptz,
  total_deleted int,
  per_step jsonb,
  failed_step text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden: admin role required' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.action,
    al.user_id,
    al.created_at,
    COALESCE((al.new_values->>'total_deleted')::int, 0) AS total_deleted,
    COALESCE(al.new_values->'per_step', '{}'::jsonb) AS per_step,
    al.new_values->>'failed_step' AS failed_step
  FROM public.audit_logs al
  WHERE al.action IN ('MANUAL_TEST_DATA_CLEANUP_BATCHED', 'AUTO_TEST_DATA_CLEANUP', 'TEST_DATA_GENERATED')
  ORDER BY al.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

REVOKE ALL ON FUNCTION public.get_test_cleanup_history(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_test_cleanup_history(int) TO authenticated;

-- RPC: Historique runs cron (lit cron.job_run_details)
CREATE OR REPLACE FUNCTION public.get_cron_run_history(p_jobname text, p_limit int DEFAULT 10)
RETURNS TABLE (
  jobid bigint,
  runid bigint,
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden: admin role required' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT jrd.jobid, jrd.runid, jrd.job_pid, jrd.database, jrd.username,
         jrd.command, jrd.status, jrd.return_message, jrd.start_time, jrd.end_time
  FROM cron.job_run_details jrd
  JOIN cron.job j ON j.jobid = jrd.jobid
  WHERE j.jobname = p_jobname
  ORDER BY jrd.start_time DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_run_history(text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_run_history(text, int) TO authenticated;

-- Seuils financiers TestModeBanner
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('test_mode_billing_alert_pct', '0.5'::jsonb, 'Seuil ratio TEST/total au-dessus duquel TestModeBanner s''affiche (0..1)'),
  ('test_mode_billing_min_volume', '20'::jsonb, 'Volume minimum de factures avant que TestModeBanner se déclenche')
ON CONFLICT (setting_key) DO NOTHING;