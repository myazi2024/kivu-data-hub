-- Créer quelques factures de test pour démontrer le compteur
-- Utiliser NULL pour user_id pour éviter les contraintes de clé étrangère
INSERT INTO public.cadastral_invoices (
  user_id,
  parcel_number,
  selected_services,
  total_amount_usd,
  status,
  client_email,
  invoice_number,
  geographical_zone
) VALUES 
(
  NULL,
  'TEST-001',
  '["information", "location_history"]',
  5.00,
  'paid',
  'test1@example.com',
  'INV-TEST-001',
  'Kinshasa, Gombe, Kinshasa'
),
(
  NULL,
  'TEST-002', 
  '["information", "history", "obligations"]',
  21.00,
  'paid',
  'test2@example.com',
  'INV-TEST-002',
  'Lubumbashi, Centre, Haut-Katanga'
),
(
  NULL,
  'TEST-003',
  '["location_history"]',
  2.00,
  'paid', 
  'test3@example.com',
  'INV-TEST-003',
  'Goma, Centre, Nord-Kivu'
),
(
  NULL,
  'TEST-004',
  '["information", "obligations"]',
  18.00,
  'paid',
  'test4@example.com', 
  'INV-TEST-004',
  'Bukavu, Ibanda, Sud-Kivu'
),
(
  NULL,
  'TEST-005',
  '["history"]',
  3.00,
  'paid',
  'test5@example.com',
  'INV-TEST-005',
  'Kisangani, Makiso, Tshopo'
);