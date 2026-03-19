UPDATE cadastral_contribution_config 
SET config_value = '{
  "Résidentielle - Villa / Maison individuelle": ["Durable", "Semi-durable", "Précaire"],
  "Résidentielle - Appartement": ["Durable", "Semi-durable"],
  "Résidentielle - Immeuble / Bâtiment": ["Durable", "Semi-durable"],
  "Résidentielle - Duplex / Triplex": ["Durable", "Semi-durable"],
  "Résidentielle - Studio": ["Durable", "Semi-durable", "Précaire"],
  "Commerciale - Local commercial": ["Durable", "Semi-durable", "Précaire"],
  "Commerciale - Bureau": ["Durable", "Semi-durable"],
  "Industrielle - Entrepôt / Hangar": ["Durable", "Semi-durable", "Précaire"],
  "Industrielle - Usine": ["Durable", "Semi-durable"],
  "Agricole": ["Durable", "Semi-durable", "Précaire", "Non bâti"],
  "Terrain nu": ["Non bâti"]
}'::jsonb,
    updated_at = now()
WHERE config_key = 'picklist_construction_nature';

UPDATE cadastral_contribution_config 
SET config_value = '{
  "Non bâti": ["Terrain vacant", "Agriculture", "Parking"],
  "Résidentielle - Villa / Maison individuelle_Durable": ["Habitation", "Usage mixte"],
  "Résidentielle - Villa / Maison individuelle_Semi-durable": ["Habitation", "Usage mixte"],
  "Résidentielle - Villa / Maison individuelle_Précaire": ["Habitation"],
  "Résidentielle - Appartement_Durable": ["Habitation", "Usage mixte"],
  "Résidentielle - Appartement_Semi-durable": ["Habitation", "Usage mixte"],
  "Résidentielle - Immeuble / Bâtiment_Durable": ["Habitation", "Usage mixte", "Bureau"],
  "Résidentielle - Immeuble / Bâtiment_Semi-durable": ["Habitation", "Usage mixte"],
  "Résidentielle - Duplex / Triplex_Durable": ["Habitation", "Usage mixte"],
  "Résidentielle - Duplex / Triplex_Semi-durable": ["Habitation", "Usage mixte"],
  "Résidentielle - Studio_Durable": ["Habitation"],
  "Résidentielle - Studio_Semi-durable": ["Habitation"],
  "Résidentielle - Studio_Précaire": ["Habitation"],
  "Commerciale - Local commercial_Durable": ["Commerce", "Bureau", "Usage mixte", "Entrepôt"],
  "Commerciale - Local commercial_Semi-durable": ["Commerce", "Bureau", "Entrepôt"],
  "Commerciale - Local commercial_Précaire": ["Commerce"],
  "Commerciale - Bureau_Durable": ["Bureau", "Usage mixte"],
  "Commerciale - Bureau_Semi-durable": ["Bureau"],
  "Industrielle - Entrepôt / Hangar_Durable": ["Industrie", "Entrepôt"],
  "Industrielle - Entrepôt / Hangar_Semi-durable": ["Industrie", "Entrepôt"],
  "Industrielle - Entrepôt / Hangar_Précaire": ["Industrie"],
  "Industrielle - Usine_Durable": ["Industrie", "Entrepôt"],
  "Industrielle - Usine_Semi-durable": ["Industrie"],
  "Agricole_Non bâti": ["Agriculture"],
  "Agricole_Durable": ["Agriculture", "Habitation"],
  "Agricole_Semi-durable": ["Agriculture", "Habitation"],
  "Agricole_Précaire": ["Agriculture", "Habitation"],
  "Terrain nu_Non bâti": ["Terrain vacant", "Agriculture", "Parking"]
}'::jsonb,
    updated_at = now()
WHERE config_key = 'picklist_declared_usage';