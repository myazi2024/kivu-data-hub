-- Insert sample mortgage data for demonstration
-- First, let's insert some sample mortgages for existing parcels
INSERT INTO cadastral_mortgages (
  parcel_id,
  mortgage_amount_usd,
  duration_months,
  creditor_name,
  creditor_type,
  mortgage_status,
  contract_date
) VALUES 
-- Active mortgage with partial payments
(
  '550e8400-e29b-41d4-a716-446655440001',
  50000,
  120,
  'Banque Centrale du Congo',
  'Banque',
  'active',
  '2022-03-15'
),
-- Paid off mortgage
(
  '550e8400-e29b-41d4-a716-446655440001',
  25000,
  60,
  'FINCA Microfinance',
  'Institution financière',
  'paid_off',
  '2020-01-10'
),
-- Defaulted mortgage
(
  '550e8400-e29b-41d4-a716-446655440002',
  75000,
  180,
  'Jean Mukendi',
  'Particulier',
  'defaulted',
  '2021-06-20'
),
-- Another active mortgage
(
  '550e8400-e29b-41d4-a716-446655440002',
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
-- Payments for first mortgage (active, partially paid)
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
-- Payments for second mortgage (paid off completely)
(
  (SELECT id FROM cadastral_mortgages WHERE creditor_name = 'FINCA Microfinance' LIMIT 1),
  25000,
  '2023-12-10',
  'total'
),
-- Partial payments for defaulted mortgage (stopped paying)
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
-- Recent payments for newest mortgage
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