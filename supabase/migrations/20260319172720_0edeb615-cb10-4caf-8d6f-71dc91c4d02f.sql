-- Fix picklist_construction_nature to match simplified 5-type structure
UPDATE public.cadastral_contribution_config 
SET config_value = '{"Résidentielle": ["Durable", "Semi-durable", "Précaire"], "Commerciale": ["Durable", "Semi-durable", "Précaire"], "Industrielle": ["Durable", "Semi-durable", "Précaire"], "Agricole": ["Durable", "Semi-durable", "Précaire", "Non bâti"], "Terrain nu": ["Non bâti"]}'::jsonb,
    updated_at = now()
WHERE config_key = 'picklist_construction_nature';

-- Fix picklist_declared_usage to match simplified keys
UPDATE public.cadastral_contribution_config 
SET config_value = '{"Non bâti": ["Terrain vacant", "Agriculture", "Parking"], "Résidentielle_Durable": ["Habitation", "Usage mixte"], "Résidentielle_Semi-durable": ["Habitation", "Usage mixte"], "Résidentielle_Précaire": ["Habitation"], "Commerciale_Durable": ["Commerce", "Bureau", "Usage mixte", "Entrepôt"], "Commerciale_Semi-durable": ["Commerce", "Bureau", "Entrepôt"], "Commerciale_Précaire": ["Commerce"], "Industrielle_Durable": ["Industrie", "Entrepôt"], "Industrielle_Semi-durable": ["Industrie", "Entrepôt"], "Industrielle_Précaire": ["Industrie"], "Agricole_Non bâti": ["Agriculture"], "Agricole_Durable": ["Agriculture", "Habitation"], "Agricole_Semi-durable": ["Agriculture", "Habitation"], "Agricole_Précaire": ["Agriculture", "Habitation"], "Terrain nu_Non bâti": ["Terrain vacant", "Agriculture", "Parking"]}'::jsonb,
    updated_at = now()
WHERE config_key = 'picklist_declared_usage';

-- Fix picklist_construction_materials to dependent format
UPDATE public.cadastral_contribution_config 
SET config_value = '{"Durable": ["Béton armé", "Briques cuites", "Parpaings", "Pierre naturelle"], "Semi-durable": ["Semi-dur", "Briques adobes", "Bois", "Mixte"], "Précaire": ["Tôles", "Bois", "Paille", "Autre"]}'::jsonb,
    updated_at = now()
WHERE config_key = 'picklist_construction_materials';

-- Insert picklist_standing config
INSERT INTO public.cadastral_contribution_config (config_key, config_value, description, is_active)
VALUES ('picklist_standing', '{"Durable": ["Haut standing", "Moyen standing", "Économique"], "Semi-durable": ["Moyen standing", "Économique"], "Précaire": ["Économique"]}'::jsonb, 'Standing / Niveau de finition par nature de construction', true)
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();