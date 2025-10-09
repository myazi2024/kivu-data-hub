-- Ajouter les colonnes title_reference_number et whatsapp_number à la table cadastral_parcels
ALTER TABLE public.cadastral_parcels
ADD COLUMN IF NOT EXISTS title_reference_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;