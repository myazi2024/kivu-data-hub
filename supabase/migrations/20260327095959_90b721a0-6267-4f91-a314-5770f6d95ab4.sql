-- Fix: Reset bypass_payment to false in payment_mode config
-- This is a data correction: bypass_payment was incorrectly set to true
UPDATE cadastral_search_config 
SET config_value = jsonb_set(config_value::jsonb, '{bypass_payment}', 'false'),
    updated_at = now()
WHERE config_key = 'payment_mode' AND is_active = true;