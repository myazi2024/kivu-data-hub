INSERT INTO public.permissions (resource_name, action_name, display_name, description) VALUES
  ('property_data', 'read', 'Consulter les données foncières', 'Permet de consulter les informations détaillées des parcelles (propriétaires, surfaces, coordonnées)'),
  ('property_data', 'export', 'Exporter les données foncières', 'Permet d''exporter les fiches cadastrales et rapports fonciers'),
  ('property_data', 'read_pii', 'Accéder aux données personnelles', 'Permet d''accéder aux données personnelles identifiables (noms, téléphones, documents) des propriétaires'),
  ('property_data', 'read_history', 'Consulter l''historique foncier', 'Permet de consulter l''historique des mutations et transactions d''une parcelle');