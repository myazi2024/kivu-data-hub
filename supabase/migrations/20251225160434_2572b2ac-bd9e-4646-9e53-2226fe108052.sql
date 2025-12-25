-- Créer la table de configuration des frais d'expertise immobilière
CREATE TABLE IF NOT EXISTS public.expertise_fees_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_name TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.expertise_fees_config ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique
CREATE POLICY "Expertise fees config is readable by everyone"
ON public.expertise_fees_config
FOR SELECT
USING (true);

-- Politique d'écriture pour les admins uniquement
CREATE POLICY "Only admins can modify expertise fees config"
ON public.expertise_fees_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Créer la table des paiements d'expertise
CREATE TABLE IF NOT EXISTS public.expertise_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expertise_request_id UUID NOT NULL REFERENCES public.real_estate_expertise_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  fee_items JSONB NOT NULL DEFAULT '[]',
  total_amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_provider TEXT,
  phone_number TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.expertise_payments ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour l'utilisateur propriétaire
CREATE POLICY "Users can view their own expertise payments"
ON public.expertise_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Politique de création pour les utilisateurs authentifiés
CREATE POLICY "Users can create their own expertise payments"
ON public.expertise_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique de mise à jour pour l'utilisateur propriétaire
CREATE POLICY "Users can update their own expertise payments"
ON public.expertise_payments
FOR UPDATE
USING (auth.uid() = user_id);

-- Politique de lecture pour les admins
CREATE POLICY "Admins can view all expertise payments"
ON public.expertise_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Insérer les frais par défaut
INSERT INTO public.expertise_fees_config (fee_name, amount_usd, description, is_mandatory, display_order) VALUES
('Frais d''expertise', 100, 'Frais d''évaluation immobilière par un expert agréé', true, 1),
('Frais de déplacement', 25, 'Déplacement de l''expert sur le terrain', true, 2),
('Frais de dossier', 15, 'Traitement administratif du dossier', true, 3);

-- Ajouter colonne payment_status à real_estate_expertise_requests
ALTER TABLE public.real_estate_expertise_requests 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';