-- Enrichir la table cadastral_services_config avec les nouveaux champs
ALTER TABLE public.cadastral_services_config
ADD COLUMN IF NOT EXISTS icon_name text DEFAULT 'FileText',
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS required_data_fields jsonb DEFAULT '[]'::jsonb;

-- Créer une table pour la configuration du catalogue et de la recherche
CREATE TABLE IF NOT EXISTS public.catalog_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catalog_config ENABLE ROW LEVEL SECURITY;

-- Policy : Admins peuvent tout gérer
CREATE POLICY "Admins can manage catalog config"
  ON public.catalog_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Policy : Tout le monde peut lire la config active
CREATE POLICY "Catalog config viewable by everyone"
  ON public.catalog_config
  FOR SELECT
  USING (is_active = true);

-- Trigger pour updated_at
CREATE TRIGGER update_catalog_config_updated_at
  BEFORE UPDATE ON public.catalog_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- Insérer les configurations par défaut
INSERT INTO public.catalog_config (config_key, config_value, description) VALUES
(
  'search_animated_examples',
  '[
    "BIC-001-RV-2024",
    "SU/001/GOMA/2023",
    "SR/045/BUKAVU/2024",
    "BIC-078-NK-2024",
    "PARCELLE-123"
  ]'::jsonb,
  'Exemples animés affichés dans la barre de recherche cadastrale'
),
(
  'search_predictive_settings',
  '{
    "enabled": true,
    "min_chars": 2,
    "debounce_ms": 300,
    "max_results": 5
  }'::jsonb,
  'Paramètres de la recherche prédictive'
),
(
  'discount_code_placeholders',
  '[
    "BIC-RV001",
    "PROMO2024",
    "REMISE50",
    "CADASTRE10"
  ]'::jsonb,
  'Exemples de codes de réduction affichés en placeholder'
),
(
  'ccc_configuration',
  '{
    "base_value_usd": 5.00,
    "validity_days": 90,
    "code_prefix": "CCC-",
    "min_value_usd": 0.50
  }'::jsonb,
  'Configuration des codes CCC (Contributeur Cadastral)'
),
(
  'ui_display_settings',
  '{
    "services_expanded_by_default": true,
    "show_data_availability_indicator": true,
    "animation_duration_ms": 200,
    "placeholder_typing_speed_ms": 150
  }'::jsonb,
  'Paramètres d''affichage de l''interface utilisateur'
),
(
  'service_availability_messages',
  '{
    "all_available": "Bonne nouvelle : cette parcelle dispose d''informations cadastrales détaillées. Parcourez la liste ci-dessus et sélectionnez les données que vous souhaitez consulter.",
    "partial_available": "Cette parcelle dispose de certaines informations cadastrales. Sélectionnez les services disponibles ci-dessous.",
    "minimal_available": "Cette parcelle dispose d''informations limitées. Nous vous encourageons à contribuer pour enrichir les données.",
    "data_missing": "Données manquantes",
    "data_available": "Données disponibles"
  }'::jsonb,
  'Messages personnalisables pour la disponibilité des données'
)
ON CONFLICT (config_key) DO NOTHING;

-- Mettre à jour les services existants avec des icônes et un ordre d'affichage
UPDATE public.cadastral_services_config
SET 
  icon_name = CASE service_id
    WHEN 'information' THEN 'Info'
    WHEN 'location_history' THEN 'MapPin'
    WHEN 'history' THEN 'History'
    WHEN 'obligations' THEN 'Receipt'
    WHEN 'legal_verification' THEN 'Shield'
    ELSE 'FileText'
  END,
  display_order = CASE service_id
    WHEN 'information' THEN 1
    WHEN 'location_history' THEN 2
    WHEN 'history' THEN 3
    WHEN 'obligations' THEN 4
    WHEN 'legal_verification' THEN 5
    ELSE 99
  END,
  required_data_fields = CASE service_id
    WHEN 'information' THEN '["parcel_number", "property_title_type", "current_owner_name"]'::jsonb
    WHEN 'location_history' THEN '["province", "ville", "gps_coordinates", "boundary_history"]'::jsonb
    WHEN 'history' THEN '["ownership_history"]'::jsonb
    WHEN 'obligations' THEN '["tax_history", "mortgage_history"]'::jsonb
    ELSE '[]'::jsonb
  END
WHERE icon_name IS NULL;