ALTER TABLE public.subdivision_requests
  ADD COLUMN IF NOT EXISTS requester_legal_status text,
  ADD COLUMN IF NOT EXISTS requester_gender text,
  ADD COLUMN IF NOT EXISTS requester_entity_type text,
  ADD COLUMN IF NOT EXISTS requester_entity_subtype text,
  ADD COLUMN IF NOT EXISTS requester_rccm_number text,
  ADD COLUMN IF NOT EXISTS requester_right_type text,
  ADD COLUMN IF NOT EXISTS requester_state_exploited_by text,
  ADD COLUMN IF NOT EXISTS requester_nationality text;