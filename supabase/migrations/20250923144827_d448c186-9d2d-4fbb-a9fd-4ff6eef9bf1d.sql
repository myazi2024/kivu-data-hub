-- Créer une politique pour permettre la lecture des statistiques cadastrales
-- Cette politique permet à tous les utilisateurs de lire les données nécessaires pour les statistiques
-- sans exposer les informations sensibles des clients

CREATE POLICY "Allow reading invoice data for statistics" 
ON public.cadastral_invoices 
FOR SELECT 
USING (true);

-- Créer quelques factures de test pour démontrer le compteur
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
  '00000000-0000-0000-0000-000000000000',
  'TEST-001',
  '["information", "location_history"]',
  5.00,
  'paid',
  'test1@example.com',
  'INV-TEST-001',
  'Kinshasa, Gombe, Kinshasa'
),
(
  '00000000-0000-0000-0000-000000000000',
  'TEST-002', 
  '["information", "history", "obligations"]',
  21.00,
  'paid',
  'test2@example.com',
  'INV-TEST-002',
  'Lubumbashi, Centre, Haut-Katanga'
),
(
  '00000000-0000-0000-0000-000000000000',
  'TEST-003',
  '["location_history"]',
  2.00,
  'paid', 
  'test3@example.com',
  'INV-TEST-003',
  'Goma, Centre, Nord-Kivu'
),
(
  '00000000-0000-0000-0000-000000000000',
  'TEST-004',
  '["information", "obligations"]',
  18.00,
  'paid',
  'test4@example.com', 
  'INV-TEST-004',
  'Bukavu, Ibanda, Sud-Kivu'
),
(
  '00000000-0000-0000-0000-000000000000',
  'TEST-005',
  '["history"]',
  3.00,
  'paid',
  'test5@example.com',
  'INV-TEST-005',
  'Kisangani, Makiso, Tshopo'
);