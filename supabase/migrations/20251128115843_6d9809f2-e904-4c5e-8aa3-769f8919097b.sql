-- Créer la configuration par défaut pour map_preview_settings
INSERT INTO cadastral_contribution_config (config_key, config_value, description, is_active)
VALUES (
  'map_preview_settings',
  '{
    "enabled": true,
    "defaultZoom": 15,
    "defaultCenter": { "lat": -4.0383, "lng": 21.7587 },
    "showMarkers": true,
    "autoCalculateSurface": true,
    "minMarkers": 3,
    "maxMarkers": 50,
    "markerColor": "#3b82f6",
    "showSideDimensions": true,
    "dimensionUnit": "m",
    "dimensionTextColor": "#000000",
    "dimensionFontSize": 11,
    "dimensionFormat": "{value}m",
    "allowDimensionEditing": true,
    "showSideLabels": true,
    "lineColor": "#3b82f6",
    "lineWidth": 3,
    "lineStyle": "solid",
    "fillColor": "#3b82f6",
    "fillOpacity": 0.2,
    "minSurfaceSqm": 0,
    "maxSurfaceSqm": 100000,
    "enableEditing": true,
    "enableDragging": true,
    "enableConflictDetection": true,
    "enableRoadBorderingFeature": true,
    "roadTypes": [
      { "value": "nationale", "label": "Route Nationale" },
      { "value": "provinciale", "label": "Route Provinciale" },
      { "value": "urbaine", "label": "Route Urbaine" },
      { "value": "avenue", "label": "Avenue" },
      { "value": "rue", "label": "Rue" },
      { "value": "ruelle", "label": "Ruelle" },
      { "value": "chemin", "label": "Chemin" },
      { "value": "piste", "label": "Piste" }
    ]
  }'::jsonb,
  'Configuration des paramètres d''affichage de la carte de parcelle dans le formulaire CCC',
  true
)
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();