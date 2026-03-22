UPDATE cadastral_contribution_config 
SET config_value = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(config_value::jsonb, 
            '{Résidentielle_Durable}', '["Habitation", "Usage mixte", "Location"]'::jsonb),
          '{Résidentielle_Semi-durable}', '["Habitation", "Usage mixte", "Location"]'::jsonb),
        '{Commerciale_Durable}', '["Commerce", "Bureau", "Usage mixte", "Entrepôt", "Location"]'::jsonb),
      '{Commerciale_Semi-durable}', '["Commerce", "Bureau", "Entrepôt", "Location"]'::jsonb),
    '{Industrielle_Durable}', '["Industrie", "Entrepôt", "Location"]'::jsonb),
  '{Industrielle_Semi-durable}', '["Industrie", "Entrepôt", "Location"]'::jsonb),
updated_at = now()
WHERE config_key = 'picklist_declared_usage' AND is_active = true;