-- Initialiser la configuration map_preview_settings si elle n'existe pas
INSERT INTO public.cadastral_contribution_config (
  config_key,
  config_value,
  description,
  is_active
)
SELECT 
  'map_preview_settings',
  jsonb_build_object(
    'enabled', true,
    'defaultZoom', 15,
    'defaultCenter', jsonb_build_object('lat', -4.0383, 'lng', 21.7587),
    'showMarkers', true,
    'autoCalculateSurface', true,
    'minMarkers', 3,
    'maxMarkers', 50,
    'markerColor', '#3b82f6',
    'showSideDimensions', true,
    'dimensionUnit', 'm',
    'dimensionTextColor', '#000000',
    'dimensionFontSize', 11,
    'dimensionFormat', '{value}m',
    'allowDimensionEditing', true,
    'showSideLabels', true,
    'lineColor', '#3b82f6',
    'lineWidth', 3,
    'lineStyle', 'solid',
    'fillColor', '#3b82f6',
    'fillOpacity', 0.2,
    'minSurfaceSqm', 0,
    'maxSurfaceSqm', 100000,
    'enableEditing', true,
    'enableDragging', true,
    'enableConflictDetection', true,
    'enableRoadBorderingFeature', true,
    'roadTypes', jsonb_build_array(
      jsonb_build_object('value', 'nationale', 'label', 'Route Nationale'),
      jsonb_build_object('value', 'provinciale', 'label', 'Route Provinciale'),
      jsonb_build_object('value', 'urbaine', 'label', 'Route Urbaine'),
      jsonb_build_object('value', 'avenue', 'label', 'Avenue'),
      jsonb_build_object('value', 'rue', 'label', 'Rue'),
      jsonb_build_object('value', 'ruelle', 'label', 'Ruelle'),
      jsonb_build_object('value', 'chemin', 'label', 'Chemin'),
      jsonb_build_object('value', 'piste', 'label', 'Piste')
    )
  ),
  'Configuration des paramètres de la carte interactive dans le formulaire CCC',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.cadastral_contribution_config 
  WHERE config_key = 'map_preview_settings'
);