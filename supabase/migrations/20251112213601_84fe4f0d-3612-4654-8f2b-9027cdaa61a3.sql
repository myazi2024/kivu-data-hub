-- Add parcel_sides column to cadastral_parcels to store exact dimensions from CCC form
ALTER TABLE cadastral_parcels 
ADD COLUMN IF NOT EXISTS parcel_sides jsonb DEFAULT NULL;

COMMENT ON COLUMN cadastral_parcels.parcel_sides IS 'Dimensions exactes de chaque côté de la parcelle (en mètres), extraites des documents cadastraux officiels';

-- Add parcel_sides column to cadastral_contributions as well
ALTER TABLE cadastral_contributions 
ADD COLUMN IF NOT EXISTS parcel_sides jsonb DEFAULT NULL;

COMMENT ON COLUMN cadastral_contributions.parcel_sides IS 'Dimensions de chaque côté de la parcelle soumises dans la contribution';