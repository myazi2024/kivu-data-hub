
-- ============================================================
-- 1. Table de configuration globale du plan de lotissement
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_subdivision_plan_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_subdivision_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subdivision_plan_config_read_auth"
  ON public.app_subdivision_plan_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "subdivision_plan_config_admin_write"
  ON public.app_subdivision_plan_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_subdivision_plan_config_updated_at
  BEFORE UPDATE ON public.app_subdivision_plan_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Cadres de signature dynamiques
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subdivision_signature_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title_template text NOT NULL,
  authority text NOT NULL DEFAULT '',
  applies_to text NOT NULL DEFAULT 'both' CHECK (applies_to IN ('urban','rural','both')),
  province_filter text[] NOT NULL DEFAULT ARRAY[]::text[],
  display_order integer NOT NULL DEFAULT 0,
  show_seal boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_frames_active_order
  ON public.subdivision_signature_frames (active, display_order);

ALTER TABLE public.subdivision_signature_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signature_frames_read_auth"
  ON public.subdivision_signature_frames FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "signature_frames_admin_write"
  ON public.subdivision_signature_frames FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_signature_frames_updated_at
  BEFORE UPDATE ON public.subdivision_signature_frames
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Symboles de légende
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subdivision_legend_symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  svg_icon text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#000000',
  source_element_type text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subdivision_legend_symbols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legend_symbols_read_auth"
  ON public.subdivision_legend_symbols FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "legend_symbols_admin_write"
  ON public.subdivision_legend_symbols FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_legend_symbols_updated_at
  BEFORE UPDATE ON public.subdivision_legend_symbols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Seed cadres standards (3 urbains + 3 ruraux)
-- ============================================================
INSERT INTO public.subdivision_signature_frames (name, title_template, authority, applies_to, display_order, show_seal, active) VALUES
  ('Cadastre',         'Certifié conforme au plan cadastral',                      'Bureau d''Information Cadastrale',  'both',  1, true, true),
  ('Ville',            'Approuvé par la ville de {ville}',                         'Hôtel de Ville',                    'urban', 2, true, true),
  ('Commune',          'Vu par le Bureau de la Commune de {commune}',              'Bureau Communal',                   'urban', 3, true, true),
  ('Chefferie',        'Approuvé par le Bureau de la Chefferie {groupement}',      'Chefferie',                         'rural', 2, true, true),
  ('Territoire',       'Vu par le Chef du Territoire de {territoire}',             'Administration du Territoire',      'rural', 3, true, true),
  ('Affaires foncières','Vu par la Division des Affaires Foncières',                'Division provinciale',              'both',  4, true, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Seed symboles de légende standards
-- ============================================================
INSERT INTO public.subdivision_legend_symbols (code, label, svg_icon, color, source_element_type, display_order) VALUES
  ('lampadaire',       'Lampadaire',                'circle',  '#dc2626', 'lampadaire',       1),
  ('evacuation',       'Canal d''évacuation des eaux usées', 'line',    '#1f2937', 'canal_evacuation', 2),
  ('revetement',       'Revêtement',                'hatch',   '#374151', 'revetement',       3),
  ('cardinal_nord',    'Nord géographique',         'arrow',   '#000000', 'north_arrow',      4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 6. Seed configuration par défaut
-- ============================================================
INSERT INTO public.app_subdivision_plan_config (config_key, config_value) VALUES
  ('header', '{"organization":"Bureau d''Informations Cadastrales","title_template":"PLAN DE LOTISSEMENT DE LA PARCELLE N° {parcel_number}","subtitle":"Direction de l''Aménagement et de l''Urbanisme","country":"RÉPUBLIQUE DÉMOCRATIQUE DU CONGO","show_logo":true}'::jsonb),
  ('watermarks', '{"draft":{"text":"BROUILLON","color":"#999999","opacity":0.12},"test":{"text":"TEST","color":"#f59e0b","opacity":0.15},"sample":{"text":"SAMPLE","color":"#3b82f6","opacity":0.15}}'::jsonb),
  ('paper_format', '{"default":"A3","orientation":"landscape","margin_mm":12}'::jsonb),
  ('scale_tiers', '{"tiers":[{"max_dim_m":50,"scale":200},{"max_dim_m":125,"scale":500},{"max_dim_m":250,"scale":1000},{"max_dim_m":500,"scale":2000},{"max_dim_m":1250,"scale":5000}]}'::jsonb),
  ('report_program', '{"active":true,"whatsapp_number":"+243 000 000 000","reward_amount":50,"reward_currency":"USD","text_template":"Si vous n''avez pas de résultat positif, signalez-le au {whatsapp}. Vous pouvez gagner une récompense jusqu''à {amount} {currency}."}'::jsonb),
  ('footer_text', '{"copyright":"Reproduction interdite","legal":"Toute reproduction ou falsification est passible de poursuites judiciaires."}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- 7. RPC publique de vérification du plan
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_subdivision_plan(_ref text)
RETURNS TABLE(
  reference_number text,
  status text,
  version integer,
  approved_at timestamptz,
  parcel_number text,
  number_of_lots integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sr.reference_number,
    sr.status,
    COALESCE(sr.official_plan_version, 0) AS version,
    sr.approved_at,
    sr.parcel_number,
    sr.number_of_lots
  FROM public.subdivision_requests sr
  WHERE sr.reference_number = _ref
    AND sr.status = 'approved'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_subdivision_plan(text) TO anon, authenticated;
