ALTER TABLE public.real_estate_expertise_requests
  ADD COLUMN IF NOT EXISTS has_building_permit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS building_permit_number text,
  ADD COLUMN IF NOT EXISTS building_permit_type text,
  ADD COLUMN IF NOT EXISTS building_permit_issue_date date,
  ADD COLUMN IF NOT EXISTS building_permit_issuing_service text,
  ADD COLUMN IF NOT EXISTS building_permit_document_url text;