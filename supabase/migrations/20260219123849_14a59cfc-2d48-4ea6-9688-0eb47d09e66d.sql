
-- Create land disputes table
CREATE TABLE public.cadastral_land_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID REFERENCES public.cadastral_parcels(id),
  parcel_number TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  dispute_type TEXT NOT NULL,
  dispute_nature TEXT NOT NULL,
  dispute_description TEXT,
  parties_involved JSONB DEFAULT '[]'::jsonb,
  current_status TEXT NOT NULL DEFAULT 'en_cours',
  resolution_level TEXT,
  resolution_details TEXT,
  declarant_name TEXT NOT NULL,
  declarant_phone TEXT,
  declarant_email TEXT,
  declarant_id_number TEXT,
  declarant_quality TEXT NOT NULL DEFAULT 'proprietaire',
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  dispute_start_date DATE,
  reported_by UUID,
  lifting_request_reference TEXT,
  lifting_reason TEXT,
  lifting_documents JSONB DEFAULT '[]'::jsonb,
  lifting_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cadastral_land_disputes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create their own dispute reports"
ON public.cadastral_land_disputes
FOR INSERT
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own disputes"
ON public.cadastral_land_disputes
FOR SELECT
USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all disputes"
ON public.cadastral_land_disputes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
));

CREATE POLICY "Admins can update disputes"
ON public.cadastral_land_disputes
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
));

CREATE POLICY "Public can view disputes for parcels"
ON public.cadastral_land_disputes
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_cadastral_land_disputes_updated_at
BEFORE UPDATE ON public.cadastral_land_disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add the "Litiges fonciers" service to the catalog
INSERT INTO public.cadastral_services_config (service_id, name, description, price_usd, is_active, display_order, icon_name)
VALUES ('land_disputes', 'Litiges fonciers', 'Accédez aux informations sur les litiges fonciers enregistrés sur cette parcelle', 6.99, true, 6, 'Scale');
