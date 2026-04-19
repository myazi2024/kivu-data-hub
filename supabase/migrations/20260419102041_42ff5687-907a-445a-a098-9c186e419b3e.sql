INSERT INTO public.test_entities_registry (label_key, table_name, marker_column, marker_pattern, display_order, is_active)
VALUES
  ('mortgages', 'cadastral_mortgages', 'reference_number', 'TEST-HYP-%', 120, true),
  ('buildingPermits', 'cadastral_building_permits', 'permit_number', 'TEST-PC%', 130, true),
  ('certificates', 'generated_certificates', 'reference_number', 'TEST-CERT-%', 140, true)
ON CONFLICT (label_key) DO NOTHING;