-- Table de configuration des frais de mutation
CREATE TABLE public.mutation_fees_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_name TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des demandes de mutation
CREATE TABLE public.mutation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  parcel_number TEXT NOT NULL,
  parcel_id UUID REFERENCES public.cadastral_parcels(id),
  
  -- Type de mutation
  mutation_type TEXT NOT NULL DEFAULT 'update', -- 'update', 'transfer', 'correction'
  
  -- Informations du demandeur
  requester_type TEXT NOT NULL DEFAULT 'owner', -- 'owner', 'representative', 'third_party'
  requester_name TEXT NOT NULL,
  requester_phone TEXT,
  requester_email TEXT,
  requester_id_document_url TEXT,
  
  -- Informations pour le compte d'un tiers
  beneficiary_name TEXT,
  beneficiary_phone TEXT,
  beneficiary_id_document_url TEXT,
  
  -- Données de mutation proposées (JSON)
  proposed_changes JSONB NOT NULL DEFAULT '{}',
  justification TEXT,
  supporting_documents JSONB DEFAULT '[]',
  
  -- Paiement
  fee_items JSONB NOT NULL DEFAULT '[]',
  total_amount_usd NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  payment_id UUID,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Statut de traitement
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'rejected', 'on_hold'
  processing_notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Délai estimé
  estimated_processing_days INTEGER DEFAULT 14,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fonction pour générer le numéro de référence de mutation
CREATE OR REPLACE FUNCTION public.generate_mutation_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  reference TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reference_number FROM 'MUT-' || year_part || '-(\d+)$') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.mutation_requests
  WHERE reference_number LIKE 'MUT-' || year_part || '-%';
  
  reference := 'MUT-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN reference;
END;
$$;

-- Trigger pour auto-générer le numéro de référence
CREATE OR REPLACE FUNCTION public.set_mutation_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := public.generate_mutation_reference();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_mutation_reference_trigger
BEFORE INSERT ON public.mutation_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_mutation_reference();

-- Enable RLS
ALTER TABLE public.mutation_fees_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutation_requests ENABLE ROW LEVEL SECURITY;

-- Policies for mutation_fees_config
CREATE POLICY "Mutation fees config viewable by everyone"
ON public.mutation_fees_config
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage mutation fees config"
ON public.mutation_fees_config
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

-- Policies for mutation_requests
CREATE POLICY "Users can view their own mutation requests"
ON public.mutation_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create mutation requests"
ON public.mutation_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all mutation requests"
ON public.mutation_requests
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

CREATE POLICY "Admins can update mutation requests"
ON public.mutation_requests
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

-- Insert default mutation fees
INSERT INTO public.mutation_fees_config (fee_name, amount_usd, description, is_mandatory, display_order)
VALUES 
  ('Frais de dossier', 25.00, 'Frais administratifs pour le traitement du dossier', true, 1),
  ('Frais d''enregistrement', 50.00, 'Frais d''enregistrement de la mutation au registre foncier', true, 2),
  ('Frais de vérification', 15.00, 'Vérification des documents et données', false, 3);

-- Create index for performance
CREATE INDEX idx_mutation_requests_user_id ON public.mutation_requests(user_id);
CREATE INDEX idx_mutation_requests_parcel_number ON public.mutation_requests(parcel_number);
CREATE INDEX idx_mutation_requests_status ON public.mutation_requests(status);
CREATE INDEX idx_mutation_requests_reference ON public.mutation_requests(reference_number);