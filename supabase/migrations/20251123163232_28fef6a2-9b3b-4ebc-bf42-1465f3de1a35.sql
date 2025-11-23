-- Ajouter une configuration pour activer/désactiver le bypass du paiement
INSERT INTO cadastral_search_config (config_key, config_value, description, is_active)
VALUES (
  'payment_mode',
  '{"enabled": false, "bypass_payment": true, "test_mode": true}'::jsonb,
  'Configuration du mode de paiement pour le catalogue de services cadastraux. enabled=true active le paiement réel, bypass_payment=false désactive le mode développement',
  true
)
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();