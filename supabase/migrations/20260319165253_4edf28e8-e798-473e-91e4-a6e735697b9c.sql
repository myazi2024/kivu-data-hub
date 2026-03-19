UPDATE cadastral_contribution_config 
SET config_value = '["Résidentielle", "Commerciale", "Industrielle", "Agricole", "Terrain nu"]'::jsonb,
    updated_at = now()
WHERE config_key = 'picklist_construction_type';