INSERT INTO public.catalog_config (config_key, config_value, description, is_active)
VALUES ('available_provinces', '[]'::jsonb, 'Liste des provinces dont les données sont disponibles (affichée sur la page d''accueil)', true)
ON CONFLICT DO NOTHING;