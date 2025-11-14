-- Ajouter les champs pour la gestion des refus motivés et des recours
ALTER TABLE cadastral_contributions
ADD COLUMN IF NOT EXISTS rejection_reasons jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rejection_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS appeal_submitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appeal_data jsonb,
ADD COLUMN IF NOT EXISTS appeal_submission_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS appeal_status text DEFAULT 'none' CHECK (appeal_status IN ('none', 'pending', 'accepted', 'rejected'));

-- Ajouter un commentaire pour documenter les champs
COMMENT ON COLUMN cadastral_contributions.rejection_reasons IS 'Array des raisons de refus sélectionnées';
COMMENT ON COLUMN cadastral_contributions.rejection_date IS 'Date du refus';
COMMENT ON COLUMN cadastral_contributions.rejected_by IS 'Utilisateur ayant rejeté la demande';
COMMENT ON COLUMN cadastral_contributions.appeal_submitted IS 'Indique si un recours a été soumis';
COMMENT ON COLUMN cadastral_contributions.appeal_data IS 'Données du recours (justification, documents, etc.)';
COMMENT ON COLUMN cadastral_contributions.appeal_submission_date IS 'Date de soumission du recours';
COMMENT ON COLUMN cadastral_contributions.appeal_status IS 'Statut du recours: none, pending, accepted, rejected';