-- Table de configuration des actions de parcelle
CREATE TABLE IF NOT EXISTS public.parcel_actions_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    action_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    badge_type TEXT NOT NULL DEFAULT 'none' CHECK (badge_type IN ('none', 'nouveau', 'bientot', 'beta', 'promo')),
    badge_label TEXT,
    badge_color TEXT,
    requires_auth BOOLEAN NOT NULL DEFAULT true,
    category TEXT NOT NULL DEFAULT 'other',
    icon_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes de tri
CREATE INDEX IF NOT EXISTS idx_parcel_actions_display_order ON public.parcel_actions_config(display_order);
CREATE INDEX IF NOT EXISTS idx_parcel_actions_category ON public.parcel_actions_config(category);

-- Enable RLS
ALTER TABLE public.parcel_actions_config ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique (tout le monde peut voir les actions)
CREATE POLICY "Anyone can view parcel actions config"
ON public.parcel_actions_config
FOR SELECT
USING (true);

-- Politique de modification réservée aux admins
CREATE POLICY "Only admins can modify parcel actions config"
ON public.parcel_actions_config
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_parcel_actions_config_updated_at
BEFORE UPDATE ON public.parcel_actions_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les actions par défaut
INSERT INTO public.parcel_actions_config (action_key, label, description, is_active, is_visible, display_order, badge_type, requires_auth, category) VALUES
('expertise', 'Expertise immobilière', 'Obtenir un certificat de valeur vénale', true, true, 1, 'nouveau', true, 'expertise'),
('mutation', 'Demander Mutation', 'Transfert de propriété', true, true, 2, 'none', true, 'mutation'),
('mortgage_add', 'Ajouter Hypothèque', 'Ajouter une Hypothèque active', true, true, 3, 'none', true, 'mortgage'),
('mortgage_remove', 'Retirer Hypothèque', 'Demander la radiation', true, true, 4, 'none', true, 'mortgage'),
('permit_add', 'Ajouter Permis', 'Pour une nouvelle construction', true, true, 5, 'none', true, 'permit'),
('permit_regularization', 'Ajouter P. Régularisation', 'Régulariser une construction existante', true, true, 6, 'none', true, 'permit'),
('tax', 'Ajouter Taxe foncière', 'Signaler le paiement d''une taxe', true, true, 7, 'none', true, 'tax'),
('permit_request', 'Obtenir un permis', 'Demande de permis de construire', true, true, 8, 'none', true, 'permit'),
('subdivision', 'Demander un lotissement', 'Diviser cette parcelle en lots', true, true, 9, 'bientot', true, 'subdivision')
ON CONFLICT (action_key) DO NOTHING;