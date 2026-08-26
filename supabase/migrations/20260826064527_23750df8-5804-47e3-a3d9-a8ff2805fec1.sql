UPDATE public.cadastral_contribution_config
SET config_value = jsonb_set(config_value::jsonb, '{Terrain nu_Non bâti}', '["Parking","Espace d''entreposage","Aucun"]'::jsonb, true)
WHERE config_key = 'picklist_declared_usage';