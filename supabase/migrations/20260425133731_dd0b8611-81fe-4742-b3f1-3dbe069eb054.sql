
-- Lot D: Tarifs détaillés par type d'infrastructure
-- Surcharges optionnelles qui s'ajoutent au calcul de base par lot/voirie/espaces communs
CREATE TABLE public.subdivision_infrastructure_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_key TEXT NOT NULL,           -- ex: 'road_primary', 'road_secondary', 'sidewalk', 'street_lighting', 'green_space', 'playground', 'water_station', 'drainage'
  label TEXT NOT NULL,                         -- libellé affiché (admin/preview)
  category TEXT NOT NULL,                      -- 'voirie' | 'amenagement' | 'reseau' | 'equipement'
  unit TEXT NOT NULL,                          -- 'linear_m' | 'sqm' | 'unit' | 'lot'
  rate_usd NUMERIC(12,4) NOT NULL DEFAULT 0,   -- tarif unitaire
  section_type TEXT,                           -- 'urban' | 'rural' | NULL = applicable partout
  min_total_usd NUMERIC(12,2),                 -- plancher
  max_total_usd NUMERIC(12,2),                 -- plafond
  is_required BOOLEAN NOT NULL DEFAULT false,  -- présence obligatoire dans le projet
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (infrastructure_key, section_type)
);

CREATE INDEX idx_subdivision_infra_tariffs_active ON public.subdivision_infrastructure_tariffs(is_active, category, display_order);

ALTER TABLE public.subdivision_infrastructure_tariffs ENABLE ROW LEVEL SECURITY;

-- Lecture publique des tarifs actifs (besoin frontend pour preview citoyen)
CREATE POLICY "Public can read active infrastructure tariffs"
  ON public.subdivision_infrastructure_tariffs
  FOR SELECT
  USING (is_active = true);

-- Admin: lecture totale
CREATE POLICY "Admins can read all infrastructure tariffs"
  ON public.subdivision_infrastructure_tariffs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert infrastructure tariffs"
  ON public.subdivision_infrastructure_tariffs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update infrastructure tariffs"
  ON public.subdivision_infrastructure_tariffs
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete infrastructure tariffs"
  ON public.subdivision_infrastructure_tariffs
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Trigger updated_at
CREATE TRIGGER trg_subdivision_infra_tariffs_updated_at
  BEFORE UPDATE ON public.subdivision_infrastructure_tariffs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial — types d'infrastructures standards
INSERT INTO public.subdivision_infrastructure_tariffs
  (infrastructure_key, label, category, unit, rate_usd, section_type, is_required, display_order, description) VALUES
  ('road_primary',     'Voirie principale (asphaltée)', 'voirie',     'linear_m', 8.00,  NULL, false, 10, 'Voie carrossable revêtue, largeur ≥ 7m'),
  ('road_secondary',   'Voirie secondaire (gravier)',   'voirie',     'linear_m', 3.50,  NULL, false, 20, 'Voie carrossable en gravier compacté'),
  ('sidewalk',         'Trottoirs',                     'voirie',     'linear_m', 1.50,  NULL, false, 30, 'Trottoir piétonnier en bordure de voirie'),
  ('drainage',         'Caniveaux / drainage',          'reseau',     'linear_m', 2.00,  NULL, true,  40, 'Drainage des eaux pluviales'),
  ('street_lighting',  'Éclairage public',              'reseau',     'unit',     150.00, 'urban', false, 50, 'Lampadaire solaire ou raccordé'),
  ('water_station',    'Borne fontaine / station',      'reseau',     'unit',     500.00, NULL, false, 60, 'Point d''eau collectif'),
  ('green_space',      'Espace vert aménagé',           'amenagement','sqm',      0.80,  NULL, false, 70, 'Espace planté, pelouse, arbres'),
  ('playground',       'Aire de jeu',                   'amenagement','unit',     800.00, NULL, false, 80, 'Aire de jeu équipée pour enfants'),
  ('community_center', 'Équipement collectif',          'equipement', 'unit',     2000.00,NULL, false, 90, 'Centre communautaire, école, dispensaire')
ON CONFLICT (infrastructure_key, section_type) DO NOTHING;
