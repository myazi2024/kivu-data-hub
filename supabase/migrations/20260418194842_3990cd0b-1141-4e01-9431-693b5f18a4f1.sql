
-- =====================================================
-- P0.1 : Désactiver les fournisseurs Google tuiles (CGU)
-- =====================================================
UPDATE public.map_providers
SET is_active = false,
    description = COALESCE(description, '') || ' [DÉSACTIVÉ : nécessite contrat Google Maps Platform]'
WHERE provider_key IN ('google_roadmap', 'google_satellite', 'google_hybrid')
  AND is_active = true;

-- =====================================================
-- P0.2 : Trigger défaut unique map_providers
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_single_default_provider()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.map_providers
    SET is_default = false
    WHERE id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_default_provider ON public.map_providers;
CREATE TRIGGER trg_enforce_single_default_provider
BEFORE INSERT OR UPDATE OF is_default ON public.map_providers
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.enforce_single_default_provider();

-- =====================================================
-- P0.5 : Colonne is_active sur app_appearance_config
-- =====================================================
ALTER TABLE public.app_appearance_config
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- =====================================================
-- P0.6 : Audit log générique des configs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_config_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  config_key text,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  admin_id uuid,
  admin_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_config_audit_table ON public.system_config_audit(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_config_audit_admin ON public.system_config_audit(admin_id, created_at DESC);

ALTER TABLE public.system_config_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read config audit" ON public.system_config_audit;
CREATE POLICY "Admins can read config audit"
ON public.system_config_audit FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert config audit" ON public.system_config_audit;
CREATE POLICY "Admins can insert config audit"
ON public.system_config_audit FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_name text;
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
  v_config_key text;
BEGIN
  BEGIN
    SELECT COALESCE((raw_user_meta_data->>'full_name'), email)
    INTO v_admin_name
    FROM auth.users WHERE id = v_admin_id;
  EXCEPTION WHEN OTHERS THEN
    v_admin_name := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record_id := (v_old->>'id')::uuid;
    v_config_key := v_old->>'config_key';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := (v_new->>'id')::uuid;
    v_config_key := v_new->>'config_key';
  ELSE
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := (v_new->>'id')::uuid;
    v_config_key := v_new->>'config_key';
  END IF;

  INSERT INTO public.system_config_audit(
    table_name, record_id, config_key, action, old_values, new_values, admin_id, admin_name
  ) VALUES (
    TG_TABLE_NAME, v_record_id, v_config_key, TG_OP, v_old, v_new, v_admin_id, v_admin_name
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to 19 *_config tables (skip analytics_charts_config and billing tables which already have their own audit)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'app_appearance_config',
    'cadastral_contribution_config',
    'cadastral_results_config',
    'cadastral_search_config',
    'cadastral_services_config',
    'catalog_config',
    'currency_config',
    'expertise_fees_config',
    'land_title_fees_config',
    'mutation_fees_config',
    'parcel_actions_config',
    'payment_methods_config',
    'permit_fees_config',
    'pitch_slides_config',
    'property_tax_rates_config',
    'subdivision_rate_config',
    'tax_exemptions_config',
    'tax_payment_fees_config',
    'map_providers'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_log_config_change ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_log_config_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_config_change()',
      t
    );
  END LOOP;
END $$;

-- =====================================================
-- P1.9 : Snapshots / Rollback
-- =====================================================
CREATE TABLE IF NOT EXISTS public.config_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  snapshot_name text NOT NULL,
  description text,
  snapshot_data jsonb NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_config_snapshots_table ON public.config_snapshots(table_name, created_at DESC);

ALTER TABLE public.config_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage config snapshots" ON public.config_snapshots;
CREATE POLICY "Admins manage config snapshots"
ON public.config_snapshots FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- P2.16 : Table map_config dédiée
-- =====================================================
CREATE TABLE IF NOT EXISTS public.map_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.map_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active map config" ON public.map_config;
CREATE POLICY "Public read active map config"
ON public.map_config FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage map config" ON public.map_config;
CREATE POLICY "Admins manage map config"
ON public.map_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_log_config_change ON public.map_config;
CREATE TRIGGER trg_log_config_change
AFTER INSERT OR UPDATE OR DELETE ON public.map_config
FOR EACH ROW EXECUTE FUNCTION public.log_config_change();

-- Migrate map_preview_settings from cadastral_contribution_config
INSERT INTO public.map_config (config_key, config_value, description)
SELECT 'map_preview_settings', config_value, 'Migré depuis cadastral_contribution_config'
FROM public.cadastral_contribution_config
WHERE config_key = 'map_preview_settings'
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- P2.14 : Tables géographiques normalisées
-- =====================================================
CREATE TABLE IF NOT EXISTS public.provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  capital text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id uuid REFERENCES public.provinces(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(province_id, name)
);

CREATE TABLE IF NOT EXISTS public.communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city_id, name)
);

CREATE TABLE IF NOT EXISTS public.quartiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id uuid REFERENCES public.communes(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(commune_id, name)
);

ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quartiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read provinces" ON public.provinces;
CREATE POLICY "Public read provinces" ON public.provinces FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage provinces" ON public.provinces;
CREATE POLICY "Admins manage provinces" ON public.provinces FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Public read cities" ON public.cities;
CREATE POLICY "Public read cities" ON public.cities FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage cities" ON public.cities;
CREATE POLICY "Admins manage cities" ON public.cities FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Public read communes" ON public.communes;
CREATE POLICY "Public read communes" ON public.communes FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage communes" ON public.communes;
CREATE POLICY "Admins manage communes" ON public.communes FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Public read quartiers" ON public.quartiers;
CREATE POLICY "Public read quartiers" ON public.quartiers FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage quartiers" ON public.quartiers;
CREATE POLICY "Admins manage quartiers" ON public.quartiers FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Seed provinces RDC
INSERT INTO public.provinces (code, name, capital, display_order) VALUES
  ('KN', 'Kinshasa', 'Kinshasa', 1),
  ('KC', 'Kongo Central', 'Matadi', 2),
  ('KW', 'Kwango', 'Kenge', 3),
  ('KL', 'Kwilu', 'Bandundu', 4),
  ('MN', 'Mai-Ndombe', 'Inongo', 5),
  ('KS', 'Kasaï', 'Tshikapa', 6),
  ('KCT', 'Kasaï-Central', 'Kananga', 7),
  ('KO', 'Kasaï-Oriental', 'Mbuji-Mayi', 8),
  ('LO', 'Lomami', 'Kabinda', 9),
  ('SK', 'Sankuru', 'Lusambo', 10),
  ('MA', 'Maniema', 'Kindu', 11),
  ('SU', 'Sud-Kivu', 'Bukavu', 12),
  ('NK', 'Nord-Kivu', 'Goma', 13),
  ('IT', 'Ituri', 'Bunia', 14),
  ('HU', 'Haut-Uele', 'Isiro', 15),
  ('BU', 'Bas-Uele', 'Buta', 16),
  ('TS', 'Tshopo', 'Kisangani', 17),
  ('MO', 'Mongala', 'Lisala', 18),
  ('NU', 'Nord-Ubangi', 'Gbadolite', 19),
  ('SUB', 'Sud-Ubangi', 'Gemena', 20),
  ('EQ', 'Équateur', 'Mbandaka', 21),
  ('TU', 'Tshuapa', 'Boende', 22),
  ('TA', 'Tanganyika', 'Kalemie', 23),
  ('HL', 'Haut-Lomami', 'Kamina', 24),
  ('LU', 'Lualaba', 'Kolwezi', 25),
  ('HK', 'Haut-Katanga', 'Lubumbashi', 26)
ON CONFLICT (code) DO NOTHING;

-- updated_at triggers
DO $$
DECLARE
  t text;
  geo_tables text[] := ARRAY['provinces','cities','communes','quartiers','map_config'];
BEGIN
  FOREACH t IN ARRAY geo_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t
    );
  END LOOP;
END $$;
