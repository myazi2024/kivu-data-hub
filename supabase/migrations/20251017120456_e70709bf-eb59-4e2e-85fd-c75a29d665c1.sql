-- Table pour gérer les paramètres de la barre de recherche cadastrale
CREATE TABLE public.cadastral_search_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_cadastral_search_config_key ON public.cadastral_search_config(config_key);
CREATE INDEX idx_cadastral_search_config_active ON public.cadastral_search_config(is_active);

-- Enable RLS
ALTER TABLE public.cadastral_search_config ENABLE ROW LEVEL SECURITY;

-- Policy pour lecture publique des configs actives
CREATE POLICY "Search config is viewable by everyone"
  ON public.cadastral_search_config
  FOR SELECT
  USING (is_active = true);

-- Policy pour gestion par les admins
CREATE POLICY "Admins can manage search config"
  ON public.cadastral_search_config
  FOR ALL
  USING (get_current_user_role() = 'admin');

-- Trigger pour updated_at
CREATE TRIGGER update_cadastral_search_config_updated_at
  BEFORE UPDATE ON public.cadastral_search_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_cadastral_search_config
  AFTER INSERT OR UPDATE OR DELETE ON public.cadastral_search_config
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_cadastral_changes();

-- Insérer les configurations par défaut
INSERT INTO public.cadastral_search_config (config_key, config_value, description) VALUES
(
  'animated_examples',
  '["SU/2130/KIN", "SU/0456/GOM", "SR/01/0987/BEN", "SR/0321/MAS"]'::jsonb,
  'Exemples animés affichés dans la barre de recherche'
),
(
  'format_urbain',
  '{
    "code": "SU",
    "label": "Section Urbaine",
    "format": "SU/[Section]/[Parcelle]/[Code]",
    "examples": [
      {"code": "SU/2130/KIN", "note": null},
      {"code": "SU/0456/GOM", "note": null},
      {"code": "SU/2130/1/KIN", "note": "Morcellement"}
    ]
  }'::jsonb,
  'Configuration du format de code cadastral urbain'
),
(
  'format_rural',
  '{
    "code": "SR",
    "label": "Section Rurale",
    "format": "SR/[Section]/[Parcelle]/[Code]",
    "examples": [
      {"code": "SR/01/0987/BEN", "note": null},
      {"code": "SR/0321/MAS", "note": null}
    ]
  }'::jsonb,
  'Configuration du format de code cadastral rural'
),
(
  'error_messages',
  '{
    "not_found": "Aucune parcelle trouvée pour ce numéro cadastral.",
    "not_found_help": "Il est possible qu''il y ait une erreur de saisie ou que cette parcelle ne soit pas encore enregistrée dans notre base de données ou n''a pas encore été attribué un numéro parcellaire.",
    "verification_prompt": "Vérifiez manuellement dans notre base des données les informations à votre disposition pour s''en assurer."
  }'::jsonb,
  'Messages d''erreur personnalisables'
);