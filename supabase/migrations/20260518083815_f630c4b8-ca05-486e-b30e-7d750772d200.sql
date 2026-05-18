
-- 1) Colonnes manquantes : chemin géographique complet + versionning optimiste
ALTER TABLE public.subdivision_zoning_rules
  ADD COLUMN IF NOT EXISTS province_path text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- 2) Index unique sur (section_type, location_name, province_path) — résout les homonymes
DROP INDEX IF EXISTS idx_subdivision_zoning_rules_unique_path;
CREATE UNIQUE INDEX idx_subdivision_zoning_rules_unique_path
  ON public.subdivision_zoning_rules (
    section_type,
    location_name,
    COALESCE(province_path, '{}'::text[])
  );

-- 3) Trigger d'audit -> system_config_audit
CREATE OR REPLACE FUNCTION public.audit_subdivision_zoning_rules_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_config_audit (config_key, action, new_value, changed_by)
    VALUES ('subdivision_zoning_rule:'||NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.system_config_audit (config_key, action, old_value, new_value, changed_by)
    VALUES ('subdivision_zoning_rule:'||NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.system_config_audit (config_key, action, old_value, changed_by)
    VALUES ('subdivision_zoning_rule:'||OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_subdivision_zoning_rules ON public.subdivision_zoning_rules;
CREATE TRIGGER trg_audit_subdivision_zoning_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.subdivision_zoning_rules
  FOR EACH ROW EXECUTE FUNCTION public.audit_subdivision_zoning_rules_change();

-- 4) Trigger d'incrémentation automatique de version
CREATE OR REPLACE FUNCTION public.bump_subdivision_zoning_rule_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_subdivision_zoning_rule_version ON public.subdivision_zoning_rules;
CREATE TRIGGER trg_bump_subdivision_zoning_rule_version
  BEFORE UPDATE ON public.subdivision_zoning_rules
  FOR EACH ROW EXECUTE FUNCTION public.bump_subdivision_zoning_rule_version();
