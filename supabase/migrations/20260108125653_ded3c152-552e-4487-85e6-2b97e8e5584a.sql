-- Table pour les demandes de lotissement
CREATE TABLE public.subdivision_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    parcel_number VARCHAR(100) NOT NULL,
    parcel_id UUID REFERENCES public.cadastral_parcels(id),
    
    -- Informations de la parcelle mère
    parent_parcel_area_sqm NUMERIC NOT NULL,
    parent_parcel_location TEXT,
    parent_parcel_owner_name TEXT NOT NULL,
    parent_parcel_title_reference TEXT,
    parent_parcel_gps_coordinates JSONB,
    
    -- Informations du demandeur
    requester_first_name VARCHAR(100) NOT NULL,
    requester_last_name VARCHAR(100) NOT NULL,
    requester_middle_name VARCHAR(100),
    requester_phone VARCHAR(50) NOT NULL,
    requester_email VARCHAR(255),
    requester_type VARCHAR(50) DEFAULT 'particulier',
    requester_id_document_url TEXT,
    
    -- Détails du lotissement
    number_of_lots INTEGER NOT NULL,
    lots_data JSONB NOT NULL DEFAULT '[]',
    subdivision_sketch_url TEXT,
    subdivision_plan_data JSONB,
    
    -- Justification
    purpose_of_subdivision TEXT,
    intended_use_per_lot JSONB,
    
    -- Documents joints
    proof_of_ownership_url TEXT,
    additional_documents JSONB,
    
    -- Frais
    fee_items JSONB DEFAULT '[]',
    submission_fee_usd NUMERIC DEFAULT 20,
    remaining_fee_usd NUMERIC DEFAULT 0,
    total_amount_usd NUMERIC DEFAULT 20,
    
    -- Paiement
    submission_payment_status VARCHAR(50) DEFAULT 'pending',
    submission_paid_at TIMESTAMP WITH TIME ZONE,
    submission_payment_id UUID,
    final_payment_status VARCHAR(50),
    final_paid_at TIMESTAMP WITH TIME ZONE,
    final_payment_id UUID,
    
    -- Statut de traitement
    status VARCHAR(50) DEFAULT 'pending',
    processing_notes TEXT,
    rejection_reason TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    estimated_processing_days INTEGER DEFAULT 30,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour la recherche
CREATE INDEX idx_subdivision_requests_user ON public.subdivision_requests(user_id);
CREATE INDEX idx_subdivision_requests_parcel ON public.subdivision_requests(parcel_number);
CREATE INDEX idx_subdivision_requests_status ON public.subdivision_requests(status);
CREATE INDEX idx_subdivision_requests_reference ON public.subdivision_requests(reference_number);

-- Enable RLS
ALTER TABLE public.subdivision_requests ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Users can view their own subdivision requests"
ON public.subdivision_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subdivision requests"
ON public.subdivision_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending requests"
ON public.subdivision_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Policy pour les admins (via has_role)
CREATE POLICY "Admins can view all subdivision requests"
ON public.subdivision_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subdivision requests"
ON public.subdivision_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ajouter les permissions pour le service de lotissement
INSERT INTO public.permissions (resource_name, action_name, display_name, description)
VALUES 
    ('subdivision_requests', 'view', 'Voir les demandes de lotissement', 'Permet de consulter toutes les demandes de lotissement'),
    ('subdivision_requests', 'create', 'Créer des demandes de lotissement', 'Permet de soumettre des demandes de lotissement'),
    ('subdivision_requests', 'approve', 'Approuver les demandes de lotissement', 'Permet d''approuver ou rejeter les demandes de lotissement'),
    ('subdivision_requests', 'process', 'Traiter les demandes de lotissement', 'Permet de traiter et assigner les demandes de lotissement'),
    ('subdivision_requests', 'delete', 'Supprimer les demandes de lotissement', 'Permet de supprimer les demandes de lotissement'),
    ('subdivision_requests', 'generate_plan', 'Générer les plans de lotissement', 'Permet de générer et valider les plans de lotissement officiels');

-- Trigger pour updated_at
CREATE TRIGGER update_subdivision_requests_updated_at
BEFORE UPDATE ON public.subdivision_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();