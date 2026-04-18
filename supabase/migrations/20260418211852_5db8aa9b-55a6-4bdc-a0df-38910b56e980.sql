
-- =====================================================
-- 1. AUDIT TRIGGERS RH (7 tables hr_*)
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_hr_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_changed jsonb;
  v_record_id uuid;
BEGIN
  SELECT email INTO v_actor_name FROM auth.users WHERE id = v_actor;

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
  ELSE
    v_record_id := NEW.id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(key, value)
    INTO v_changed
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
  END IF;

  INSERT INTO public.history_audit(table_name, record_id, action, actor_id, actor_name, changed_fields, old_values, new_values)
  VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_actor,
    v_actor_name,
    v_changed,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['hr_employees','hr_candidates','hr_leave_requests','hr_leave_balances','hr_documents','hr_job_positions','hr_reviews']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I_changes ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER audit_%I_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_hr_changes();', t, t);
  END LOOP;
END $$;

-- =====================================================
-- 2. PURGE OLD AUDIT LOGS
-- =====================================================
CREATE OR REPLACE FUNCTION public.purge_old_audit_logs(_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH deleted AS (
    DELETE FROM public.audit_logs
    WHERE created_at < (now() - make_interval(days => _days))
      AND action IN ('INSERT','DELETE')
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;

  RETURN jsonb_build_object('deleted', v_count, 'cutoff_days', _days, 'purged_at', now());
END;
$$;

-- =====================================================
-- 3. PARCEL ACTIONS — rename permit → building_permit
-- =====================================================
UPDATE public.parcel_actions_config SET category = 'building_permit' WHERE category = 'permit';

CREATE OR REPLACE FUNCTION public.bulk_update_parcel_actions(_actions jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action jsonb;
  v_updated int := 0;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  FOR v_action IN SELECT * FROM jsonb_array_elements(_actions) LOOP
    UPDATE public.parcel_actions_config SET
      label = COALESCE(v_action->>'label', label),
      description = COALESCE(v_action->>'description', description),
      is_active = COALESCE((v_action->>'is_active')::boolean, is_active),
      is_visible = COALESCE((v_action->>'is_visible')::boolean, is_visible),
      display_order = COALESCE((v_action->>'display_order')::int, display_order),
      badge_type = COALESCE(v_action->>'badge_type', badge_type),
      badge_label = COALESCE(v_action->>'badge_label', badge_label),
      badge_color = COALESCE(v_action->>'badge_color', badge_color),
      requires_auth = COALESCE((v_action->>'requires_auth')::boolean, requires_auth),
      category = COALESCE(v_action->>'category', category),
      updated_at = now()
    WHERE id = (v_action->>'id')::uuid;
    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;

-- =====================================================
-- 4. LIST PUBLIC TABLES WITH COUNT (dynamic system health)
-- =====================================================
CREATE OR REPLACE FUNCTION public.list_public_tables_with_count()
RETURNS TABLE(table_name text, row_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count bigint;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  FOR r IN
    SELECT c.relname::text AS tname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', r.tname) INTO v_count;
      table_name := r.tname;
      row_count := v_count;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      table_name := r.tname;
      row_count := 0;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- =====================================================
-- 5. SYSTEM HEALTH SNAPSHOTS (P2)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  db_latency_ms integer,
  auth_latency_ms integer,
  storage_latency_ms integer,
  edge_fn_latency_ms integer,
  edge_fn_status text,
  total_records bigint,
  total_tables integer,
  notes jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_captured_at ON public.system_health_snapshots(captured_at DESC);
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read health snapshots" ON public.system_health_snapshots;
CREATE POLICY "Admins can read health snapshots" ON public.system_health_snapshots
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]));

DROP POLICY IF EXISTS "Admins can insert health snapshots" ON public.system_health_snapshots;
CREATE POLICY "Admins can insert health snapshots" ON public.system_health_snapshots
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]));

-- =====================================================
-- 6. HR — auto matricule + user_id
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS public.hr_employee_matricule_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_employee_matricule()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.matricule IS NULL OR NEW.matricule = '' THEN
    NEW.matricule := 'EMP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.hr_employee_matricule_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr_employees_set_matricule ON public.hr_employees;
CREATE TRIGGER hr_employees_set_matricule
  BEFORE INSERT ON public.hr_employees
  FOR EACH ROW EXECUTE FUNCTION public.generate_employee_matricule();

ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hr_employees_user_id ON public.hr_employees(user_id);

-- Self-service policy: employee can read their own record
DROP POLICY IF EXISTS "Employees can view their own record" ON public.hr_employees;
CREATE POLICY "Employees can view their own record" ON public.hr_employees
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- =====================================================
-- 7. SYSTEM SETTINGS (P2)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
CREATE POLICY "Anyone can read system settings" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can write system settings" ON public.system_settings;
CREATE POLICY "Admins can write system settings" ON public.system_settings
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]));

INSERT INTO public.system_settings(setting_key, setting_value, description) VALUES
  ('timezone', '"Africa/Kinshasa"'::jsonb, 'Fuseau horaire par défaut'),
  ('default_currency', '"USD"'::jsonb, 'Devise par défaut'),
  ('locale', '"fr-CD"'::jsonb, 'Locale par défaut'),
  ('max_upload_mb', '20'::jsonb, 'Taille upload max (MB)'),
  ('latency_thresholds', '{"db":500,"auth":300,"storage":500,"edge":2000}'::jsonb, 'Seuils latence (ms)'),
  ('audit_logs_purge_days', '30'::jsonb, 'Rétention logs audit auto (j)'),
  ('test_mode_max_hours', '24'::jsonb, 'Alerte si mode test actif > N heures')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 8. AUDIT GENERIC sur app_appearance_config (versioning)
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_appearance_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
BEGIN
  SELECT email INTO v_actor_name FROM auth.users WHERE id = v_actor;
  INSERT INTO public.system_config_audit(table_name, record_id, config_key, action, old_values, new_values, admin_id, admin_name)
  VALUES (
    'app_appearance_config',
    COALESCE(NEW.id, OLD.id)::text,
    COALESCE(NEW.config_key, OLD.config_key),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) ELSE NULL END,
    v_actor,
    v_actor_name
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_appearance_config_changes ON public.app_appearance_config;
CREATE TRIGGER audit_appearance_config_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.app_appearance_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_appearance_changes();

-- =====================================================
-- 9. RPC count_audit_logs (compteur exact)
-- =====================================================
CREATE OR REPLACE FUNCTION public.count_audit_logs()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT count(*) FROM public.audit_logs
  WHERE has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]);
$$;

-- =====================================================
-- 10. Schedule monthly purge cron
-- =====================================================
DO $$
BEGIN
  PERFORM cron.unschedule('purge-old-audit-logs-monthly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-old-audit-logs-monthly',
  '0 3 1 * *',
  $$ SELECT public.purge_old_audit_logs(30); $$
);
