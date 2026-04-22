-- Lot 4: Tiered pricing for subdivision rates + audit coverage

-- 1) Add optional tier fields to subdivision_rate_config (backward compatible)
ALTER TABLE public.subdivision_rate_config
  ADD COLUMN IF NOT EXISTS tier_threshold_sqm NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS tier_rate_per_sqm_usd NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS road_fee_per_linear_m_usd NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS common_space_fee_per_sqm_usd NUMERIC NULL;

COMMENT ON COLUMN public.subdivision_rate_config.tier_threshold_sqm IS 'Surface (m²) au-delà de laquelle le tarif dégressif tier_rate s''applique sur la portion supérieure';
COMMENT ON COLUMN public.subdivision_rate_config.tier_rate_per_sqm_usd IS 'Tarif dégressif appliqué à la portion de surface au-delà de tier_threshold_sqm';
COMMENT ON COLUMN public.subdivision_rate_config.road_fee_per_linear_m_usd IS 'Frais d''aménagement de voirie par mètre linéaire (optionnel)';
COMMENT ON COLUMN public.subdivision_rate_config.common_space_fee_per_sqm_usd IS 'Frais espaces communs par m² (optionnel)';

-- 2) Generic audit trigger function for subdivision config tables (if not already shared)
CREATE OR REPLACE FUNCTION public.log_subdivision_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_name text;
BEGIN
  SELECT COALESCE(p.full_name, p.email, auth.uid()::text) INTO v_admin_name
  FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;

  INSERT INTO public.system_config_audit (
    table_name, record_id, action, admin_id, admin_name, old_values, new_values
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    v_admin_name,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3) Attach audit trigger to subdivision_rate_config
DROP TRIGGER IF EXISTS trg_audit_subdivision_rate_config ON public.subdivision_rate_config;
CREATE TRIGGER trg_audit_subdivision_rate_config
AFTER INSERT OR UPDATE OR DELETE ON public.subdivision_rate_config
FOR EACH ROW EXECUTE FUNCTION public.log_subdivision_config_change();

-- 4) Attach same audit trigger to subdivision_zoning_rules (Lot 1 table)
DROP TRIGGER IF EXISTS trg_audit_subdivision_zoning_rules ON public.subdivision_zoning_rules;
CREATE TRIGGER trg_audit_subdivision_zoning_rules
AFTER INSERT OR UPDATE OR DELETE ON public.subdivision_zoning_rules
FOR EACH ROW EXECUTE FUNCTION public.log_subdivision_config_change();