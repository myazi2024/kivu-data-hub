-- Créer la table de configuration du formulaire de contribution cadastrale
CREATE TABLE IF NOT EXISTS public.cadastral_contribution_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contribution_config_key ON public.cadastral_contribution_config(config_key);
CREATE INDEX IF NOT EXISTS idx_contribution_config_active ON public.cadastral_contribution_config(is_active);

-- Activer RLS
ALTER TABLE public.cadastral_contribution_config ENABLE ROW LEVEL SECURITY;

-- Politique: Admins peuvent tout gérer
CREATE POLICY "Admins can manage contribution config"
ON public.cadastral_contribution_config
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

-- Politique: Tout le monde peut voir les configs actives
CREATE POLICY "Contribution config is viewable by everyone"
ON public.cadastral_contribution_config
FOR SELECT
TO public
USING (is_active = true);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_contribution_config_updated_at
BEFORE UPDATE ON public.cadastral_contribution_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insérer les configurations par défaut
INSERT INTO public.cadastral_contribution_config (config_key, config_value, description) VALUES
(
  'form_sections',
  '{
    "general_info": {"enabled": true, "label": "Informations générales", "order": 1},
    "building_permits": {"enabled": true, "label": "Permis de construire", "order": 2},
    "location": {"enabled": true, "label": "Localisation", "order": 3},
    "gps_coordinates": {"enabled": true, "label": "Coordonnées GPS", "order": 4},
    "ownership_history": {"enabled": true, "label": "Historique de propriété", "order": 5},
    "obligations": {"enabled": true, "label": "Obligations", "order": 6},
    "attachments": {"enabled": true, "label": "Pièces jointes", "order": 7}
  }'::jsonb,
  'Configuration des sections du formulaire de contribution'
),
(
  'required_fields',
  '{
    "parcel_number": true,
    "property_title_type": false,
    "current_owner_name": false,
    "area_sqm": false,
    "province": false,
    "ville": false
  }'::jsonb,
  'Configuration des champs obligatoires'
),
(
  'field_labels',
  '{
    "parcel_number": "Numéro de parcelle",
    "property_title_type": "Type de titre de propriété",
    "current_owner_name": "Propriétaire actuel",
    "area_sqm": "Superficie (m²)",
    "province": "Province",
    "ville": "Ville"
  }'::jsonb,
  'Labels personnalisés pour les champs'
),
(
  'help_texts',
  '{
    "general_info": "Renseignez les informations générales de la parcelle",
    "building_permits": "Ajoutez les permis de construire associés",
    "location": "Indiquez la localisation précise",
    "gps_coordinates": "Enregistrez les coordonnées GPS des bornes",
    "ownership_history": "Historique des propriétaires",
    "obligations": "Taxes et hypothèques",
    "attachments": "Documents justificatifs"
  }'::jsonb,
  'Textes d''aide pour chaque section'
),
(
  'validation_rules',
  '{
    "min_area_sqm": 0,
    "max_area_sqm": 1000000,
    "require_gps": false,
    "min_gps_points": 3,
    "require_building_permit": false,
    "require_attachments": false
  }'::jsonb,
  'Règles de validation du formulaire'
),
(
  'ccc_calculation',
  '{
    "base_value": 5.00,
    "min_value": 0.50,
    "completeness_weight": 1.0,
    "quality_bonus": 0.5
  }'::jsonb,
  'Configuration du calcul de valeur des codes CCC'
)
ON CONFLICT (config_key) DO NOTHING;