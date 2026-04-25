-- Lot E: persist infrastructures selected by the user on a subdivision request
ALTER TABLE public.subdivision_requests
  ADD COLUMN IF NOT EXISTS selected_infrastructures JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS infrastructure_fee_usd NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.subdivision_requests.selected_infrastructures IS
  'Liste [{infrastructure_key,label,unit,quantity,rate_usd,subtotal_usd}] sélectionnée par le citoyen au formulaire (Lot E).';
COMMENT ON COLUMN public.subdivision_requests.infrastructure_fee_usd IS
  'Surcoût total infrastructures (mirroir client/serveur).';