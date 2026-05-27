UPDATE public.cadastral_search_config
SET config_value = jsonb_set(config_value, '{enabled}', 'false'::jsonb, false),
    updated_at = now()
WHERE config_key = 'test_mode';