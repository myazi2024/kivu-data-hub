-- Ajouter les champs de pièces jointes aux tables cadastrales

-- Table cadastral_parcels: ajouter pièces jointes pour propriétaire actuel et titre de propriété
ALTER TABLE public.cadastral_parcels
ADD COLUMN IF NOT EXISTS owner_document_url TEXT,
ADD COLUMN IF NOT EXISTS property_title_document_url TEXT;

COMMENT ON COLUMN public.cadastral_parcels.owner_document_url IS 'URL du document d''identité ou justificatif du propriétaire actuel';
COMMENT ON COLUMN public.cadastral_parcels.property_title_document_url IS 'URL du titre de propriété (certificat d''enregistrement, concession, etc.)';

-- Table cadastral_ownership_history: ajouter pièce jointe pour titre de chaque propriétaire
ALTER TABLE public.cadastral_ownership_history
ADD COLUMN IF NOT EXISTS ownership_document_url TEXT;

COMMENT ON COLUMN public.cadastral_ownership_history.ownership_document_url IS 'URL du titre de propriété pour ce propriétaire historique';

-- Table cadastral_boundary_history: ajouter pièce jointe pour PV de bornage
ALTER TABLE public.cadastral_boundary_history
ADD COLUMN IF NOT EXISTS boundary_document_url TEXT;

COMMENT ON COLUMN public.cadastral_boundary_history.boundary_document_url IS 'URL du procès-verbal de bornage réalisé par le géomètre';

-- Table cadastral_tax_history: ajouter pièce jointe pour reçu fiscal
ALTER TABLE public.cadastral_tax_history
ADD COLUMN IF NOT EXISTS receipt_document_url TEXT;

COMMENT ON COLUMN public.cadastral_tax_history.receipt_document_url IS 'URL du reçu de paiement fiscal délivré par les services compétents';

-- Table cadastral_mortgage_payments: ajouter pièce jointe pour reçu de paiement
ALTER TABLE public.cadastral_mortgage_payments
ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;

COMMENT ON COLUMN public.cadastral_mortgage_payments.payment_receipt_url IS 'URL du reçu de paiement hypothécaire';

-- Table cadastral_building_permits: ajouter commentaire sur le champ existant
COMMENT ON COLUMN public.cadastral_building_permits.permit_document_url IS 'URL du permis de bâtir délivré par les services compétents';