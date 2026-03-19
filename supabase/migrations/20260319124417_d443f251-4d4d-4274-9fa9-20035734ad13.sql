UPDATE cadastral_contribution_config 
SET config_value = '["Résidentielle - Villa / Maison individuelle", "Résidentielle - Appartement", "Résidentielle - Immeuble / Bâtiment", "Résidentielle - Duplex / Triplex", "Résidentielle - Studio", "Commerciale - Local commercial", "Commerciale - Bureau", "Industrielle - Entrepôt / Hangar", "Industrielle - Usine", "Agricole", "Terrain nu", "Autre"]'::jsonb,
    updated_at = now()
WHERE config_key = 'picklist_construction_type';