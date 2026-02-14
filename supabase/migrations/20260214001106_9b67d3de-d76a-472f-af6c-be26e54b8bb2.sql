-- Seed default state agencies for the suggestive picklist
INSERT INTO public.suggestive_picklist_values (picklist_key, value, usage_count, is_default)
VALUES
  ('state_agencies_drc', 'Office des Routes (OR)', 10, true),
  ('state_agencies_drc', 'Régie Générale des Carrières et des Mines (GÉCAMINES)', 10, true),
  ('state_agencies_drc', 'Société Nationale d''Électricité (SNEL)', 10, true),
  ('state_agencies_drc', 'Régie de Distribution d''Eau (REGIDESO)', 10, true),
  ('state_agencies_drc', 'Direction Générale des Impôts (DGI)', 10, true),
  ('state_agencies_drc', 'Forces Armées de la RDC (FARDC)', 10, true),
  ('state_agencies_drc', 'Police Nationale Congolaise (PNC)', 10, true),
  ('state_agencies_drc', 'Ministère de la Défense Nationale', 10, true),
  ('state_agencies_drc', 'Ministère des Affaires Foncières', 10, true),
  ('state_agencies_drc', 'Ministère de l''Urbanisme et Habitat', 10, true),
  ('state_agencies_drc', 'Office Congolais de Contrôle (OCC)', 10, true),
  ('state_agencies_drc', 'Société Commerciale des Transports et Ports (SCTP)', 10, true),
  ('state_agencies_drc', 'Régie des Voies Aériennes (RVA)', 10, true),
  ('state_agencies_drc', 'Radio-Télévision Nationale Congolaise (RTNC)', 10, true),
  ('state_agencies_drc', 'Université de Kinshasa (UNIKIN)', 10, true),
  ('state_agencies_drc', 'Université de Lubumbashi (UNILU)', 10, true),
  ('state_agencies_drc', 'Hôpital Général de Référence', 10, true),
  ('state_agencies_drc', 'Direction Générale de Migration (DGM)', 10, true),
  ('state_agencies_drc', 'Agence Nationale de Renseignements (ANR)', 10, true),
  ('state_agencies_drc', 'Gouvernorat de Province', 10, true)
ON CONFLICT DO NOTHING;