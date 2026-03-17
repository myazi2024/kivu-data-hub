
-- Seed static picklist options into cadastral_contribution_config
-- Each config_key starts with 'picklist_' for easy identification

INSERT INTO cadastral_contribution_config (config_key, config_value, description, is_active) VALUES

-- Owner legal status
('picklist_legal_status', '["Personne physique", "Personne morale", "État"]'::jsonb,
 'Statuts juridiques des propriétaires', true),

-- Gender
('picklist_gender', '["Masculin", "Féminin"]'::jsonb,
 'Options de genre pour les personnes physiques', true),

-- Entity type (for Personne morale)
('picklist_entity_type', '["Société", "Association"]'::jsonb,
 'Types d''entités pour les personnes morales', true),

-- Entity subtype: Société
('picklist_entity_subtype_societe', '["Entreprise individuelle (Ets)", "Société en Participation (SEP)", "Société à Responsabilité Limitée (SARL)", "Société Anonyme (SA)", "Société par Actions Simplifiée (SAS)", "Société en Nom Collectif (SNC)", "Société en Commandite Simple (SCS)", "Groupement d''Intérêt Économique (GIE)", "Autre"]'::jsonb,
 'Formes juridiques des sociétés', true),

-- Entity subtype: Association
('picklist_entity_subtype_association', '["Association sans but lucratif (ASBL)", "Établissement d''Utilité Publique (EUP)", "Autre"]'::jsonb,
 'Types d''associations', true),

-- Right type (for État)
('picklist_right_type', '["Concession", "Affectation"]'::jsonb,
 'Types de droits pour les parcelles de l''État', true),

-- Construction type
('picklist_construction_type', '["Résidentielle", "Commerciale", "Industrielle", "Agricole", "Terrain nu"]'::jsonb,
 'Types de construction', true),

-- Construction nature (dependent on construction type)
('picklist_construction_nature', '{"Résidentielle": ["Durable", "Semi-durable", "Précaire"], "Commerciale": ["Durable", "Semi-durable", "Précaire"], "Industrielle": ["Durable", "Semi-durable", "Précaire"], "Agricole": ["Durable", "Semi-durable", "Précaire", "Non bâti"], "Terrain nu": ["Non bâti"]}'::jsonb,
 'Natures de construction par type (dépendant)', true),

-- Construction materials
('picklist_construction_materials', '["Béton armé", "Briques cuites", "Briques adobes", "Parpaings", "Bois", "Tôles", "Semi-dur", "Mixte", "Autre"]'::jsonb,
 'Matériaux de construction', true),

-- Declared usage (dependent on type + nature)
('picklist_declared_usage', '{
  "Non bâti": ["Terrain vacant", "Agriculture", "Parking"],
  "Résidentielle_Durable": ["Habitation", "Usage mixte"],
  "Résidentielle_Semi-durable": ["Habitation", "Usage mixte"],
  "Résidentielle_Précaire": ["Habitation"],
  "Commerciale_Durable": ["Commerce", "Bureau", "Usage mixte", "Entrepôt"],
  "Commerciale_Semi-durable": ["Commerce", "Bureau", "Entrepôt"],
  "Commerciale_Précaire": ["Commerce"],
  "Industrielle_Durable": ["Industrie", "Entrepôt"],
  "Industrielle_Semi-durable": ["Industrie", "Entrepôt"],
  "Industrielle_Précaire": ["Industrie"],
  "Agricole_Non bâti": ["Agriculture"],
  "Agricole_Durable": ["Agriculture", "Habitation"],
  "Agricole_Semi-durable": ["Agriculture", "Habitation"],
  "Agricole_Précaire": ["Agriculture", "Habitation"],
  "Terrain nu_Non bâti": ["Terrain vacant", "Agriculture", "Parking"]
}'::jsonb,
 'Usages déclarés par type+nature de construction (dépendant)', true),

-- Mutation type
('picklist_mutation_type', '["Vente", "Donation", "Succession", "Expropriation", "Échange"]'::jsonb,
 'Types de mutation/transfert de propriété', true),

-- Tax type
('picklist_tax_type', '["Impôt foncier annuel", "Impôt sur les revenus locatifs", "Taxe de bâtisse", "Taxe de superficie", "Taxe de plus-value immobilière", "Taxe d''habitation", "Autre taxe"]'::jsonb,
 'Types de taxes foncières', true),

-- Tax payment status
('picklist_tax_payment_status', '["Payé", "Payé partiellement", "En attente", "En retard"]'::jsonb,
 'Statuts de paiement des taxes', true),

-- Creditor type
('picklist_creditor_type', '["Banque", "Microfinance", "Coopérative", "Particulier", "Autre institution"]'::jsonb,
 'Types de créanciers hypothécaires', true),

-- Mortgage status
('picklist_mortgage_status', '["Active", "En défaut", "Renégociée"]'::jsonb,
 'Statuts des hypothèques', true),

-- Permit administrative status
('picklist_permit_admin_status', '["En attente", "Approuvé", "Rejeté", "Expiré"]'::jsonb,
 'Statuts administratifs des permis de construire', true)

ON CONFLICT (config_key) DO NOTHING;
