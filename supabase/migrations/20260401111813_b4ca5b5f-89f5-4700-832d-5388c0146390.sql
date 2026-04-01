
-- Enum for document types
CREATE TYPE public.document_type AS ENUM (
  'report', 'invoice', 'permit', 'certificate', 'expertise', 'mortgage_receipt'
);

-- Table for document verification
CREATE TABLE public.document_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_code TEXT NOT NULL UNIQUE,
  document_type public.document_type NOT NULL,
  parcel_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMPTZ,
  invalidated_by UUID REFERENCES auth.users(id),
  invalidation_reason TEXT,
  client_name TEXT,
  client_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_document_verifications_code ON public.document_verifications(verification_code);
CREATE INDEX idx_document_verifications_user ON public.document_verifications(user_id);
CREATE INDEX idx_document_verifications_parcel ON public.document_verifications(parcel_number);

-- Enable RLS
ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;

-- Public read access (for verification page)
CREATE POLICY "Anyone can verify documents"
  ON public.document_verifications
  FOR SELECT
  USING (true);

-- Authenticated users can insert their own verifications
CREATE POLICY "Authenticated users can create verifications"
  ON public.document_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can update (invalidate) documents
CREATE POLICY "Admins can update verifications"
  ON public.document_verifications
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- Function to generate verification codes
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  LOOP
    random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    new_code := 'BIC-' || year_part || '-' || random_part;
    SELECT EXISTS(SELECT 1 FROM public.document_verifications WHERE verification_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-set updated_at
CREATE OR REPLACE FUNCTION public.update_document_verifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_document_verifications_updated_at
  BEFORE UPDATE ON public.document_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_verifications_updated_at();
