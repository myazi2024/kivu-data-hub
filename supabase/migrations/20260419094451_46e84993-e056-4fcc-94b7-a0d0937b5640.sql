-- Mettre à jour display_order pour un ordre stable et logique
UPDATE public.cadastral_services_config SET display_order = 1 WHERE service_id = 'information';
UPDATE public.cadastral_services_config SET display_order = 2 WHERE service_id = 'location_history';
UPDATE public.cadastral_services_config SET display_order = 3 WHERE service_id = 'history';
UPDATE public.cadastral_services_config SET display_order = 4 WHERE service_id = 'obligations';
UPDATE public.cadastral_services_config SET display_order = 5 WHERE service_id = 'land_disputes';

-- Définir les règles de disponibilité des données par service
-- Format: { mode: 'any'|'all', rules: [{ field: 'path', type: 'truthy'|'non_empty_array'|'all_truthy' }] }

UPDATE public.cadastral_services_config
SET required_data_fields = '{"mode":"any","rules":[{"type":"always_true"}]}'::jsonb
WHERE service_id = 'information';

UPDATE public.cadastral_services_config
SET required_data_fields = '{"mode":"any","rules":[
  {"field":"parcel.province","type":"truthy","companion":"parcel.ville"},
  {"field":"boundary_history","type":"non_empty_array"},
  {"field":"parcel.gps_coordinates","type":"non_empty_array"}
]}'::jsonb
WHERE service_id = 'location_history';

UPDATE public.cadastral_services_config
SET required_data_fields = '{"mode":"any","rules":[
  {"field":"ownership_history","type":"non_empty_array"}
]}'::jsonb
WHERE service_id = 'history';

UPDATE public.cadastral_services_config
SET required_data_fields = '{"mode":"any","rules":[
  {"field":"tax_history","type":"non_empty_array"},
  {"field":"mortgage_history","type":"non_empty_array"}
]}'::jsonb
WHERE service_id = 'obligations';

UPDATE public.cadastral_services_config
SET required_data_fields = '{"mode":"any","rules":[{"type":"always_true"}]}'::jsonb
WHERE service_id = 'land_disputes';