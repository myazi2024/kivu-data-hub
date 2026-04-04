ALTER TABLE public.land_title_requests
  ADD COLUMN IF NOT EXISTS proposed_permit_type text,
  ADD COLUMN IF NOT EXISTS proposed_permit_number text,
  ADD COLUMN IF NOT EXISTS proposed_permit_date text,
  ADD COLUMN IF NOT EXISTS proposed_permit_service text,
  ADD COLUMN IF NOT EXISTS proposed_permit_document_url text;