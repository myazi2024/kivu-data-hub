
-- ===== 1. Catalogue matériaux drainage =====
CREATE TABLE IF NOT EXISTS public.subdivision_drainage_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  price_multiplier numeric NOT NULL DEFAULT 1.0 CHECK (price_multiplier >= 0),
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subdivision_drainage_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drainage_materials_select_all" ON public.subdivision_drainage_materials;
CREATE POLICY "drainage_materials_select_all"
  ON public.subdivision_drainage_materials FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "drainage_materials_admin_write" ON public.subdivision_drainage_materials;
CREATE POLICY "drainage_materials_admin_write"
  ON public.subdivision_drainage_materials FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_drainage_materials_updated_at ON public.subdivision_drainage_materials;
CREATE TRIGGER trg_drainage_materials_updated_at
  BEFORE UPDATE ON public.subdivision_drainage_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subdivision_drainage_materials (key, label, description, price_multiplier, display_order) VALUES
  ('beton',      'Béton armé',         'Caniveau préfabriqué ou coulé en béton armé', 1.0, 10),
  ('pvc',        'PVC',                'Tuyau / caniveau PVC',                         0.6, 20),
  ('maconnerie', 'Maçonnerie',         'Caniveau en maçonnerie traditionnelle',        0.8, 30),
  ('pierre',     'Pierre / moellons',  'Caniveau pierre ou moellons',                  1.1, 40),
  ('metal',      'Métal',              'Caniveau métallique galvanisé',                1.4, 50),
  ('composite',  'Composite',          'Caniveau composite haute résistance',          1.6, 60)
ON CONFLICT (key) DO NOTHING;

-- ===== 2. Catalogue types drainage =====
CREATE TABLE IF NOT EXISTS public.subdivision_drainage_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  price_multiplier numeric NOT NULL DEFAULT 1.0 CHECK (price_multiplier >= 0),
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subdivision_drainage_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drainage_types_select_all" ON public.subdivision_drainage_types;
CREATE POLICY "drainage_types_select_all"
  ON public.subdivision_drainage_types FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "drainage_types_admin_write" ON public.subdivision_drainage_types;
CREATE POLICY "drainage_types_admin_write"
  ON public.subdivision_drainage_types FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_drainage_types_updated_at ON public.subdivision_drainage_types;
CREATE TRIGGER trg_drainage_types_updated_at
  BEFORE UPDATE ON public.subdivision_drainage_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subdivision_drainage_types (key, label, description, price_multiplier, display_order) VALUES
  ('ouvert',  'Ouvert',                'Canal à ciel ouvert',                         1.0, 10),
  ('couvert', 'Couvert (avec dalles)', 'Canal recouvert de dalles amovibles',         1.4, 20),
  ('enterre', 'Enterré',               'Canal entièrement enterré (tuyau / busage)',  2.0, 30)
ON CONFLICT (key) DO NOTHING;

-- ===== 3. Multiplicateur pour revêtements =====
ALTER TABLE public.subdivision_road_surface_materials
  ADD COLUMN IF NOT EXISTS price_multiplier numeric NOT NULL DEFAULT 1.0 CHECK (price_multiplier >= 0);

UPDATE public.subdivision_road_surface_materials SET price_multiplier =
  CASE key
    WHEN 'gravier_stabilise' THEN 0.4
    WHEN 'beton_coule'       THEN 1.0
    WHEN 'bitume'            THEN 1.2
    WHEN 'pave_beton'        THEN 1.3
    WHEN 'briques'           THEN 1.6
    WHEN 'pave_pierre'       THEN 2.4
    ELSE price_multiplier
  END
WHERE price_multiplier = 1.0;

-- ===== 4. Nettoyage tarifs infrastructure =====
-- 4a. Supprimer toutes les variantes par matériau (devenues obsolètes — remplacées par catalogue.price_multiplier)
DELETE FROM public.subdivision_infrastructure_tariffs
WHERE infrastructure_key LIKE 'road_surface_%'
   OR infrastructure_key LIKE 'drainage_%';

-- 4b. Dédoublonnage défensif sur les clés restantes (garder la ligne avec rate > 0 la plus récente)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY infrastructure_key
           ORDER BY (rate_usd > 0) DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.subdivision_infrastructure_tariffs
)
DELETE FROM public.subdivision_infrastructure_tariffs t
USING ranked
WHERE t.id = ranked.id AND ranked.rn > 1;

-- 4c. Contrainte d'unicité
ALTER TABLE public.subdivision_infrastructure_tariffs
  DROP CONSTRAINT IF EXISTS subdivision_infrastructure_tariffs_key_unique;
ALTER TABLE public.subdivision_infrastructure_tariffs
  ADD CONSTRAINT subdivision_infrastructure_tariffs_key_unique UNIQUE (infrastructure_key);

-- 4d. Garantir les 3 tarifs de base
INSERT INTO public.subdivision_infrastructure_tariffs
  (infrastructure_key, label, category, unit, rate_usd, is_active, is_required, linked_to, display_order, description)
VALUES
  ('drainage',        'Caniveaux / drainage (base)', 'reseau', 'linear_m', 2.0,   true, false, 'drainage',        20, 'Tarif de base par mètre linéaire — multiplié par le matériau et le type choisis dans la règle de zonage.'),
  ('road_surface',    'Revêtement de voie (base)',   'voirie', 'sqm',      18.0,  true, false, 'road_surface',    10, 'Tarif de base par m² — multiplié par le matériau choisi dans la règle de zonage.'),
  ('street_lighting', 'Éclairage public (base)',     'reseau', 'unit',     150.0, true, false, 'street_lighting', 30, 'Tarif de base par lampadaire.')
ON CONFLICT (infrastructure_key) DO NOTHING;
