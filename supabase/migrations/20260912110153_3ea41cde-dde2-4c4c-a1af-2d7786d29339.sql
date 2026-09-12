ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS actual_usage text,
  ADD COLUMN IF NOT EXISTS actual_usage_other text,
  ADD COLUMN IF NOT EXISTS operational_capacity numeric,
  ADD COLUMN IF NOT EXISTS operational_capacity_unit text,
  ADD COLUMN IF NOT EXISTS lease_contract_url text;

COMMENT ON COLUMN public.cadastral_contributions.actual_usage IS 'Usage réel déclaré par l''occupant (peut différer de declared_usage)';
COMMENT ON COLUMN public.cadastral_contributions.operational_capacity IS 'Capacité d''exploitation pour un usage réel non résidentiel (postes, m³, places)';
COMMENT ON COLUMN public.cadastral_contributions.lease_contract_url IS 'Contrat de location joint (optionnel, mode un seul local)';