
-- Table pour gérer les fournisseurs de services de cartographie
CREATE TABLE public.map_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_key TEXT NOT NULL UNIQUE,
  provider_name TEXT NOT NULL,
  description TEXT,
  tile_url_template TEXT NOT NULL,
  attribution TEXT NOT NULL DEFAULT '',
  max_zoom INTEGER NOT NULL DEFAULT 19,
  min_zoom INTEGER NOT NULL DEFAULT 1,
  requires_api_key BOOLEAN NOT NULL DEFAULT false,
  api_key_env_name TEXT,
  api_key_placeholder TEXT,
  extra_config JSONB DEFAULT '{}'::jsonb,
  icon_name TEXT DEFAULT 'Map',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.map_providers ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : tout le monde (les composants frontaux doivent connaître le fournisseur actif)
CREATE POLICY "Anyone can read active map providers"
  ON public.map_providers FOR SELECT
  USING (true);

-- Politique d'écriture : admins uniquement
CREATE POLICY "Admins can manage map providers"
  ON public.map_providers FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- Trigger de mise à jour automatique du timestamp
CREATE TRIGGER update_map_providers_updated_at
  BEFORE UPDATE ON public.map_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- Fonction pour garantir un seul fournisseur par défaut
CREATE OR REPLACE FUNCTION public.ensure_single_default_map_provider()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.map_providers
    SET is_default = false, updated_at = now()
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_default_map_provider_trigger
  BEFORE INSERT OR UPDATE OF is_default ON public.map_providers
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_map_provider();

-- Insérer les fournisseurs par défaut
INSERT INTO public.map_providers (provider_key, provider_name, description, tile_url_template, attribution, max_zoom, requires_api_key, api_key_env_name, api_key_placeholder, is_active, is_default, display_order, icon_name, extra_config) VALUES
  ('osm', 'OpenStreetMap', 'Carte libre et collaborative. Gratuit, sans clé API requise.', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap contributors', 19, false, NULL, NULL, true, true, 1, 'Map', '{"subdomains": "abc"}'::jsonb),
  ('mapbox_streets', 'Mapbox Streets', 'Cartes vectorielles haute qualité avec personnalisation avancée.', 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token={apiKey}', '© Mapbox © OpenStreetMap', 22, true, 'MAPBOX_ACCESS_TOKEN', 'pk.eyJ1Ijoi...', true, false, 2, 'Map', '{"tileSize": 512, "zoomOffset": -1}'::jsonb),
  ('mapbox_satellite', 'Mapbox Satellite', 'Imagerie satellite haute résolution avec étiquettes.', 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token={apiKey}', '© Mapbox © OpenStreetMap', 22, true, 'MAPBOX_ACCESS_TOKEN', 'pk.eyJ1Ijoi...', true, false, 3, 'Map', '{"tileSize": 512, "zoomOffset": -1}'::jsonb),
  ('google_roadmap', 'Google Maps (Plan)', 'Carte routière Google Maps standard.', 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', '© Google Maps', 20, false, NULL, NULL, true, false, 4, 'Map', '{}'::jsonb),
  ('google_satellite', 'Google Maps (Satellite)', 'Vue satellite Google Maps.', 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', '© Google Maps', 20, false, NULL, NULL, true, false, 5, 'Map', '{}'::jsonb),
  ('google_hybrid', 'Google Maps (Hybride)', 'Vue satellite avec superposition des routes.', 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', '© Google Maps', 20, false, NULL, NULL, true, false, 6, 'Map', '{}'::jsonb),
  ('carto_light', 'CARTO Light', 'Fond de carte épuré idéal pour la superposition de données.', 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', '© CARTO © OpenStreetMap', 20, false, NULL, NULL, true, false, 7, 'Map', '{"subdomains": "abcd"}'::jsonb),
  ('carto_dark', 'CARTO Dark', 'Fond de carte sombre pour un rendu visuel moderne.', 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', '© CARTO © OpenStreetMap', 20, false, NULL, NULL, true, false, 8, 'Map', '{"subdomains": "abcd"}'::jsonb),
  ('esri_world', 'Esri World Imagery', 'Imagerie satellite mondiale haute résolution par Esri.', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', '© Esri', 18, false, NULL, NULL, true, false, 9, 'Map', '{}'::jsonb),
  ('stamen_terrain', 'Stadia Stamen Terrain', 'Carte topographique avec relief et couverture végétale.', 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png', '© Stadia Maps © Stamen Design © OpenStreetMap', 18, false, NULL, NULL, true, false, 10, 'Map', '{}'::jsonb);
