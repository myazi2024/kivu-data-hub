INSERT INTO public.invoice_template_config (config_key, config_value, is_active)
VALUES
  ('footer_intro_text', to_jsonb('Facture normalisée émise conformément à la réglementation fiscale en vigueur en République Démocratique du Congo.'::text), true),
  ('footer_tva_mention', to_jsonb('TVA appliquée au taux de {tva_rate}.'::text), true),
  ('footer_show_emitter_line', 'true'::jsonb, true),
  ('footer_show_dgi_code', 'true'::jsonb, true)
ON CONFLICT (config_key) DO NOTHING;