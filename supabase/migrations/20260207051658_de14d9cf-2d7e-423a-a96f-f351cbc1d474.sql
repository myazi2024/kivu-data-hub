
-- Table to store suggestive picklist values that evolve based on user input
CREATE TABLE public.suggestive_picklist_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  picklist_key TEXT NOT NULL, -- e.g. 'noise_sources', 'nearby_amenities'
  value TEXT NOT NULL,
  usage_count INT NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT false, -- true for initial seed values
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(picklist_key, value)
);

-- Enable RLS
ALTER TABLE public.suggestive_picklist_values ENABLE ROW LEVEL SECURITY;

-- Everyone can read picklist values
CREATE POLICY "Anyone can read picklist values"
ON public.suggestive_picklist_values
FOR SELECT USING (true);

-- Authenticated users can insert new values
CREATE POLICY "Authenticated users can insert picklist values"
ON public.suggestive_picklist_values
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update usage count
CREATE POLICY "Authenticated users can update picklist values"
ON public.suggestive_picklist_values
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Seed default noise sources
INSERT INTO public.suggestive_picklist_values (picklist_key, value, is_default, usage_count) VALUES
  ('noise_sources', 'Marché', true, 10),
  ('noise_sources', 'Bar / Boîte de nuit', true, 10),
  ('noise_sources', 'École', true, 10),
  ('noise_sources', 'Route principale', true, 10),
  ('noise_sources', 'Aéroport', true, 10),
  ('noise_sources', 'Usine / Industrie', true, 10),
  ('noise_sources', 'Chantier de construction', true, 10),
  ('noise_sources', 'Église / Mosquée', true, 10),
  ('noise_sources', 'Gare routière', true, 10),
  ('noise_sources', 'Générateurs électriques', true, 10);

-- Seed default nearby amenities
INSERT INTO public.suggestive_picklist_values (picklist_key, value, is_default, usage_count) VALUES
  ('nearby_amenities', 'Banque', true, 10),
  ('nearby_amenities', 'Pharmacie', true, 10),
  ('nearby_amenities', 'Supermarché', true, 10),
  ('nearby_amenities', 'Église', true, 10),
  ('nearby_amenities', 'Mosquée', true, 10),
  ('nearby_amenities', 'Station-service', true, 10),
  ('nearby_amenities', 'Restaurant', true, 10),
  ('nearby_amenities', 'Hôtel', true, 10),
  ('nearby_amenities', 'Poste de police', true, 10),
  ('nearby_amenities', 'Centre de santé', true, 10);

-- Trigger for updated_at
CREATE TRIGGER update_suggestive_picklist_values_updated_at
BEFORE UPDATE ON public.suggestive_picklist_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
