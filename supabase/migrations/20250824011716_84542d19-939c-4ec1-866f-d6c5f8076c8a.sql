-- Insert sample mortgage data using existing parcel IDs
INSERT INTO cadastral_mortgages (
  parcel_id,
  mortgage_amount_usd,
  duration_months,
  creditor_name,
  creditor_type,
  mortgage_status,
  contract_date
) VALUES 
-- Active mortgage with partial payments for first parcel
(
  'f19e34c4-b839-42a6-aaa4-173fc8092684',
  50000,
  120,
  'Banque Centrale du Congo',
  'Banque',
  'active',
  '2022-03-15'
),
-- Paid off mortgage for first parcel
(
  'f19e34c4-b839-42a6-aaa4-173fc8092684',
  25000,
  60,
  'FINCA Microfinance',
  'Institution financière',
  'paid_off',
  '2020-01-10'
),
-- Defaulted mortgage for second parcel
(
  '4042f3d7-48fd-4514-b339-e1b4ed4cb53e',
  75000,
  180,
  'Jean Mukendi',
  'Particulier',
  'defaulted',
  '2021-06-20'
),
-- Another active mortgage for second parcel
(
  '4042f3d7-48fd-4514-b339-e1b4ed4cb53e',
  30000,
  84,
  'Rawbank',
  'Banque',
  'active',
  '2023-08-01'
);

-- Insert sample mortgage payments
INSERT INTO cadastral_mortgage_payments (
  mortgage_id,
  payment_amount_usd,
  payment_date,
  payment_type
) VALUES 
-- Payments for first mortgage (active, partially paid) - Banque Centrale du Congo
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'Banque Centrale du Congo' LIMIT 1),
  5000,
  '2022-04-15',
  'partial'
),
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'Banque Centrale du Congo' LIMIT 1),
  5000,
  '2022-07-15',
  'partial'
),
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'Banque Centrale du Congo' LIMIT 1),
  10000,
  '2023-01-15',
  'partial'
),
-- Payment for second mortgage (paid off completely) - FINCA
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'FINCA Microfinance' LIMIT 1),
  25000,
  '2023-12-10',
  'total'
),
-- Partial payments for defaulted mortgage - Jean Mukendi
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'Jean Mukendi' LIMIT 1),
  10000,
  '2021-08-20',
  'partial'
),
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'Jean Mukendi' LIMIT 1),
  15000,
  '2022-02-20',
  'partial'
),
-- Recent payments for newest mortgage - Rawbank
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'Rawbank' LIMIT 1),
  3000,
  '2023-09-01',
  'partial'
),
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'Rawbank' LIMIT 1),
  3000,
  '2023-12-01',
  'partial'
),
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'Rawbank' LIMIT 1),
  4000,
  '2024-03-01',
  'partial'
);