
-- 1) Audit trigger for app_appearance_config
CREATE OR REPLACE FUNCTION public.audit_app_appearance_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_name_val text;
BEGIN
  SELECT COALESCE(p.full_name, p.email, auth.uid()::text)
    INTO admin_name_val
  FROM profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  INSERT INTO public.system_config_audit (
    table_name, record_id, config_key, action, old_values, new_values, admin_id, admin_name
  ) VALUES (
    'app_appearance_config',
    COALESCE(NEW.id, OLD.id)::text,
    COALESCE(NEW.config_key, OLD.config_key),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    admin_name_val
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_app_appearance_config ON public.app_appearance_config;
CREATE TRIGGER trg_audit_app_appearance_config
AFTER INSERT OR UPDATE OR DELETE ON public.app_appearance_config
FOR EACH ROW EXECUTE FUNCTION public.audit_app_appearance_config();

-- 2) Idempotence index for test parcels (only if column is_test exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cadastral_parcels' AND column_name='is_test'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_cadastral_parcels_test_number
             ON public.cadastral_parcels(parcel_number) WHERE is_test = true';
  END IF;
END $$;

-- 3) Seed health threshold settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('health_db_threshold_ms', '500'::jsonb, 'Seuil ms au-delà duquel la base est marquée degraded'),
  ('health_edge_threshold_ms', '1000'::jsonb, 'Seuil ms au-delà duquel les edge functions sont marquées degraded')
ON CONFLICT (setting_key) DO NOTHING;
