-- Créer une politique permettant à tous de lire les parcelles publiques
CREATE POLICY "Allow public read access to cadastral parcels"
ON public.cadastral_parcels
FOR SELECT
USING (true);