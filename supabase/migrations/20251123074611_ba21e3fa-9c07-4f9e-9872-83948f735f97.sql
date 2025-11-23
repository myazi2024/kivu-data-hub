-- Table pour la configuration des frais de demande de permis
CREATE TABLE IF NOT EXISTS public.permit_fees_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_type TEXT NOT NULL CHECK (permit_type IN ('construction', 'regularization')),
  fee_name TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les paiements de demande de permis
CREATE TABLE IF NOT EXISTS public.permit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.cadastral_contributions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permit_type TEXT NOT NULL CHECK (permit_type IN ('construction', 'regularization')),
  fee_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount_usd NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_provider TEXT,
  phone_number TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMP WITH TIME ZONE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour l'historique des actions admin sur les demandes
CREATE TABLE IF NOT EXISTS public.permit_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.cadastral_contributions(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('review_started', 'documents_requested', 'approved', 'rejected', 'documents_received')),
  comment TEXT,
  requested_documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fonction pour générer un numéro de permis unique
CREATE OR REPLACE FUNCTION public.generate_permit_number(permit_type TEXT, province TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_part TEXT;
  type_prefix TEXT;
  province_code TEXT;
  sequence_num INTEGER;
  permit_number TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  type_prefix := CASE 
    WHEN permit_type = 'construction' THEN 'PC'
    WHEN permit_type = 'regularization' THEN 'PR'
    ELSE 'PM'
  END;
  
  province_code := CASE 
    WHEN province = 'Nord-Kivu' THEN 'NK'
    WHEN province = 'Sud-Kivu' THEN 'SK'
    WHEN province = 'Kinshasa' THEN 'KIN'
    ELSE 'RDC'
  END;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(bp.permit_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.cadastral_building_permits bp
  WHERE bp.permit_number LIKE type_prefix || '-' || province_code || '-' || year_part || '-%';
  
  permit_number := type_prefix || '-' || province_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN permit_number;
END;
$$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_permit_payments_contribution ON public.permit_payments(contribution_id);
CREATE INDEX IF NOT EXISTS idx_permit_payments_user ON public.permit_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_permit_payments_status ON public.permit_payments(status);
CREATE INDEX IF NOT EXISTS idx_permit_admin_actions_contribution ON public.permit_admin_actions(contribution_id);

-- RLS Policies
ALTER TABLE public.permit_fees_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_admin_actions ENABLE ROW LEVEL SECURITY;

-- Permit fees config policies
CREATE POLICY "Permit fees config viewable by everyone"
  ON public.permit_fees_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage permit fees config"
  ON public.permit_fees_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- Permit payments policies
CREATE POLICY "Users can view their own permit payments"
  ON public.permit_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own permit payments"
  ON public.permit_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all permit payments"
  ON public.permit_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- Permit admin actions policies
CREATE POLICY "Users can view actions on their permits"
  ON public.permit_admin_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cadastral_contributions
      WHERE id = permit_admin_actions.contribution_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage permit actions"
  ON public.permit_admin_actions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- Insérer les frais par défaut
INSERT INTO public.permit_fees_config (permit_type, fee_name, amount_usd, description, is_mandatory, display_order)
VALUES
  ('construction', 'Frais d''examen du dossier', 50, 'Analyse du dossier de demande par les services techniques', true, 1),
  ('construction', 'Frais de délivrance', 150, 'Émission du permis de construire officiel', true, 2),
  ('construction', 'Caution de conformité', 200, 'Garantie pour la conformité des travaux (remboursable)', false, 3),
  ('regularization', 'Frais d''examen du dossier', 75, 'Analyse du dossier de régularisation', true, 1),
  ('regularization', 'Frais de régularisation', 100, 'Traitement de la mise en conformité', true, 2),
  ('regularization', 'Pénalité de régularisation', 50, 'Frais administratifs pour construction sans permis', true, 3)
ON CONFLICT DO NOTHING;