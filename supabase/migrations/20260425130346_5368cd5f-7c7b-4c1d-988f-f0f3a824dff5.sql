-- Lot C : éléments de plan obligatoires configurables
CREATE TABLE IF NOT EXISTS public.subdivision_plan_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- 'cartouche', 'symboles', 'cotation', 'legende', 'general'
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  validation_rule TEXT, -- code logique optionnel (ex: 'has_north_arrow')
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subdivision_plan_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan elements public read active"
  ON public.subdivision_plan_elements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Plan elements admin all read"
  ON public.subdivision_plan_elements FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Plan elements admin insert"
  ON public.subdivision_plan_elements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Plan elements admin update"
  ON public.subdivision_plan_elements FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Plan elements admin delete"
  ON public.subdivision_plan_elements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_subdivision_plan_elements_updated
  BEFORE UPDATE ON public.subdivision_plan_elements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_subdivision_plan_elements_active_order
  ON public.subdivision_plan_elements (is_active, display_order);

-- Seed initial : éléments standards d'un plan de lotissement
INSERT INTO public.subdivision_plan_elements (element_key, label, description, category, is_required, display_order, validation_rule) VALUES
  ('cartouche_titre', 'Cartouche / Titre du plan', 'Bloc titre avec référence, date, échelle, auteur', 'cartouche', true, 10, 'has_title_block'),
  ('reference_demande', 'Référence de la demande', 'Numéro de référence (ex: SUB-XXXX)', 'cartouche', true, 20, 'has_reference'),
  ('north_arrow', 'Flèche du Nord', 'Indication du Nord géographique', 'symboles', true, 30, 'has_north_arrow'),
  ('echelle_graphique', 'Échelle graphique', 'Barre d''échelle métrique', 'symboles', true, 40, 'has_scale'),
  ('echelle_numerique', 'Échelle numérique', 'Mention 1/500, 1/1000, etc.', 'cartouche', true, 50, 'has_numeric_scale'),
  ('legende', 'Légende', 'Symboles, couleurs et significations', 'legende', true, 60, 'has_legend'),
  ('cotation_lots', 'Cotation des lots', 'Dimensions (longueurs/largeurs) de chaque lot', 'cotation', true, 70, 'has_lot_dimensions'),
  ('coordonnees_bornes', 'Coordonnées GPS des bornes', 'Latitude/Longitude des sommets', 'cotation', false, 80, 'has_gps_coords'),
  ('voies_acces', 'Voies d''accès et largeurs', 'Représentation et largeur des voies', 'general', true, 90, 'has_roads'),
  ('servitudes', 'Servitudes (si applicable)', 'Lignes électriques, conduites, droits de passage', 'general', false, 100, 'has_servitudes'),
  ('parcelle_mere', 'Limites de la parcelle mère', 'Contour de la parcelle d''origine', 'general', true, 110, 'has_parent_parcel'),
  ('numerotation_lots', 'Numérotation des lots', 'Étiquettes Lot 1, Lot 2, etc.', 'general', true, 120, 'has_lot_numbers'),
  ('superficie_lots', 'Superficie de chaque lot', 'm² affichés sur ou près de chaque lot', 'cotation', true, 130, 'has_lot_areas'),
  ('signature_geometre', 'Signature du géomètre', 'Identification et signature du géomètre agréé', 'cartouche', false, 140, 'has_surveyor_signature'),
  ('cachet_officiel', 'Cachet officiel', 'Cachet de l''autorité validante', 'cartouche', false, 150, 'has_official_stamp')
ON CONFLICT (element_key) DO NOTHING;