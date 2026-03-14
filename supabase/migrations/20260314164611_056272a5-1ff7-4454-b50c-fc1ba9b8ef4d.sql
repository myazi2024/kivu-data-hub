-- Add missing columns to land_title_requests for gender, legal status, and procuration
ALTER TABLE public.land_title_requests 
  ADD COLUMN IF NOT EXISTS requester_legal_status TEXT,
  ADD COLUMN IF NOT EXISTS requester_gender TEXT,
  ADD COLUMN IF NOT EXISTS owner_gender TEXT,
  ADD COLUMN IF NOT EXISTS procuration_document_url TEXT;