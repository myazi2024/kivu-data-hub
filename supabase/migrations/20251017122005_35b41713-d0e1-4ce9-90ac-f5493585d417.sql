-- Table pour configurer les modules de résultats cadastraux
CREATE TABLE IF NOT EXISTS public.cadastral_results_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.cadastral_results_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Results config is viewable by everyone"
  ON public.cadastral_results_config
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage results config"
  ON public.cadastral_results_config
  FOR ALL
  USING (get_current_user_role() = 'admin');

-- Insérer les configurations par défaut pour les modules de résultats
INSERT INTO public.cadastral_results_config (config_key, config_value, description, is_active) VALUES
(
  'modules_info',
  '{
    "information": {
      "title": "Informations Générales",
      "description": "Informations de base sur la parcelle cadastrale",
      "icon": "FileText",
      "enabled": true,
      "fields": {
        "property_title": {"label": "Titre de propriété", "enabled": true, "help": "Type de titre foncier associé à la parcelle"},
        "area": {"label": "Superficie", "enabled": true, "help": "Surface totale de la parcelle en m² et hectares"},
        "owner": {"label": "Propriétaire actuel", "enabled": true, "help": "Nom et statut juridique du propriétaire"},
        "owner_since": {"label": "Propriétaire depuis", "enabled": true, "help": "Date d acquisition de la propriété"},
        "construction": {"label": "Type de construction", "enabled": true, "help": "Nature et type de construction sur la parcelle"},
        "usage": {"label": "Usage déclaré", "enabled": true, "help": "Usage officiel déclaré de la parcelle"}
      }
    },
    "location_history": {
      "title": "Localisation & Historique",
      "description": "Localisation géographique et historique de localisation",
      "icon": "MapPin",
      "enabled": true,
      "fields": {
        "province": {"label": "Province", "enabled": true},
        "ville": {"label": "Ville", "enabled": true},
        "commune": {"label": "Commune", "enabled": true},
        "quartier": {"label": "Quartier", "enabled": true},
        "avenue": {"label": "Avenue", "enabled": true},
        "gps": {"label": "Coordonnées GPS", "enabled": true, "help": "Coordonnées géographiques exactes"}
      }
    },
    "history": {
      "title": "Historique",
      "description": "Historique complet des mutations et modifications",
      "icon": "Clock",
      "enabled": true,
      "submodules": {
        "ownership": {"label": "Historique de propriété", "enabled": true},
        "boundary": {"label": "Bornage", "enabled": true},
        "building_permits": {"label": "Permis de construire", "enabled": true}
      }
    },
    "obligations": {
      "title": "Obligations",
      "description": "Taxes foncières et hypothèques",
      "icon": "Receipt",
      "enabled": true,
      "submodules": {
        "taxes": {"label": "Impôts fonciers", "enabled": true},
        "mortgages": {"label": "Hypothèques", "enabled": true}
      }
    }
  }'::jsonb,
  'Configuration des modules affichés dans les résultats cadastraux',
  true
),
(
  'display_settings',
  '{
    "show_map": true,
    "map_zoom_level": 15,
    "show_statistics": true,
    "show_documents": true,
    "default_tab": "general",
    "enable_pdf_download": true,
    "enable_print": true
  }'::jsonb,
  'Paramètres d affichage des résultats',
  true
),
(
  'statistics_config',
  '{
    "show_area_calculation": true,
    "show_tax_status": true,
    "show_owner_duration": true,
    "currency": "USD",
    "area_unit": "m²"
  }'::jsonb,
  'Configuration des statistiques et chiffres affichés',
  true
),
(
  'help_texts',
  '{
    "property_title": "Le titre de propriété est le document légal attestant de la propriété",
    "area_calculation": "La superficie peut être calculée à partir des coordonnées GPS ou des données cadastrales",
    "tax_status": "Le statut fiscal indique si les impôts fonciers sont à jour",
    "gps_coordinates": "Les coordonnées GPS permettent une localisation précise de la parcelle"
  }'::jsonb,
  'Textes d aide et notes explicatives',
  true
);

-- Trigger pour updated_at
CREATE TRIGGER update_cadastral_results_config_updated_at
  BEFORE UPDATE ON public.cadastral_results_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Activer la réplication en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.cadastral_results_config;