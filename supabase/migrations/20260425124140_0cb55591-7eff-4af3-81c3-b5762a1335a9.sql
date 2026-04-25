-- Référentiels métiers éditables pour le module Lotissement
-- Une seule table générique `subdivision_reference_lists` indexée par (category, key)
-- évite la prolifération de tables et permet à l'admin de gérer toutes les listes
-- (objets de demande, usages de lot, surfaces de voie, espaces communs, servitudes,
-- types de demandeur, types de clôture, types de construction) depuis une UI unique.

CREATE TYPE public.subdivision_reference_category AS ENUM (
  'purpose',
  'requester_type',
  'lot_use',
  'road_surface',
  'common_space_type',
  'servitude_type',
  'fence_type',
  'construction_type'
);

CREATE TABLE public.subdivision_reference_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.subdivision_reference_category NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  -- Métadonnées optionnelles selon la catégorie
  color text,                       -- pour lot_use / common_space_type
  applies_to_section text,          -- 'urban' | 'rural' | NULL (=both)
  extra_cost_per_unit_usd numeric,  -- ex: surcoût $/ml pour road_surface
  min_pct numeric,                  -- ex: % min pour common_space_type
  min_width_m numeric,              -- ex: largeur min pour servitude_type
  is_required boolean DEFAULT false,-- ex: servitude obligatoire
  ordering integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subdivision_reference_lists_unique UNIQUE (category, key)
);

CREATE INDEX idx_subdivision_reference_lists_active
  ON public.subdivision_reference_lists (category, is_active, ordering);

ALTER TABLE public.subdivision_reference_lists ENABLE ROW LEVEL SECURITY;

-- Lecture publique des entrées actives (le formulaire frontend en a besoin
-- avant que l'utilisateur soit authentifié pour pré-remplir les listes déroulantes).
CREATE POLICY "Public can read active subdivision reference entries"
  ON public.subdivision_reference_lists
  FOR SELECT
  USING (is_active = true);

-- Lecture complète pour les admins (incluant entrées désactivées).
CREATE POLICY "Admins can read all subdivision reference entries"
  ON public.subdivision_reference_lists
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Écriture restreinte aux admins.
CREATE POLICY "Admins can insert subdivision reference entries"
  ON public.subdivision_reference_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update subdivision reference entries"
  ON public.subdivision_reference_lists
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete subdivision reference entries"
  ON public.subdivision_reference_lists
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Trigger updated_at
CREATE TRIGGER trg_subdivision_reference_lists_updated_at
  BEFORE UPDATE ON public.subdivision_reference_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed des valeurs actuellement codées en dur dans constants.ts / types.ts
-- afin que l'application ne change pas de comportement après la migration.
INSERT INTO public.subdivision_reference_lists (category, key, label, ordering) VALUES
  ('purpose','sale','Vente',1),
  ('purpose','inheritance','Succession / Héritage',2),
  ('purpose','investment','Investissement immobilier',3),
  ('purpose','construction','Construction de logements',4),
  ('purpose','donation','Donation',5),
  ('purpose','family','Partage familial',6),
  ('purpose','commercial','Projet commercial',7),
  ('purpose','other','Autre',99);

INSERT INTO public.subdivision_reference_lists (category, key, label, ordering) VALUES
  ('requester_type','owner','Propriétaire',1),
  ('requester_type','mandatary','Mandataire',2),
  ('requester_type','notary','Notaire',3),
  ('requester_type','other','Autre',99);

INSERT INTO public.subdivision_reference_lists (category, key, label, color, ordering) VALUES
  ('lot_use','residential','Résidentiel','#22c55e',1),
  ('lot_use','commercial','Commercial','#3b82f6',2),
  ('lot_use','industrial','Industriel','#f59e0b',3),
  ('lot_use','agricultural','Agricole','#84cc16',4),
  ('lot_use','mixed','Mixte','#8b5cf6',5);

INSERT INTO public.subdivision_reference_lists (category, key, label, ordering) VALUES
  ('road_surface','asphalt','Asphalte',1),
  ('road_surface','gravel','Gravier',2),
  ('road_surface','earth','Terre',3),
  ('road_surface','paved','Pavé',4),
  ('road_surface','planned','Planifié',5);

INSERT INTO public.subdivision_reference_lists (category, key, label, color, ordering) VALUES
  ('common_space_type','green_space','Espace vert','#16a34a',1),
  ('common_space_type','parking','Parking','#6b7280',2),
  ('common_space_type','playground','Aire de jeux','#f97316',3),
  ('common_space_type','market','Marché','#ef4444',4),
  ('common_space_type','drainage','Drainage','#06b6d4',5),
  ('common_space_type','other','Autre','#a855f7',99);

INSERT INTO public.subdivision_reference_lists (category, key, label, ordering) VALUES
  ('servitude_type','passage','Passage',1),
  ('servitude_type','drainage','Drainage',2),
  ('servitude_type','utility','Utilité (eau/électricité)',3),
  ('servitude_type','view','Vue',4),
  ('servitude_type','other','Autre',99);

INSERT INTO public.subdivision_reference_lists (category, key, label, ordering) VALUES
  ('fence_type','wall','Mur',1),
  ('fence_type','wire','Grillage',2),
  ('fence_type','hedge','Haie',3),
  ('fence_type','mixed','Mixte',4);

INSERT INTO public.subdivision_reference_lists (category, key, label, ordering) VALUES
  ('construction_type','house','Maison',1),
  ('construction_type','building','Immeuble',2),
  ('construction_type','warehouse','Entrepôt',3),
  ('construction_type','other','Autre',99);
