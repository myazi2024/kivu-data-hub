-- Create properties table for real estate data
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('residential', 'commercial', 'industrial', 'land')),
  price DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'CDF', 'EUR')),
  area_sqm INTEGER NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Goma',
  province TEXT NOT NULL DEFAULT 'Nord-Kivu',
  country TEXT NOT NULL DEFAULT 'RDC',
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spaces INTEGER,
  is_available BOOLEAN NOT NULL DEFAULT true,
  contact_phone TEXT,
  contact_email TEXT,
  image_urls TEXT[],
  features TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Policies for properties
CREATE POLICY "Anyone can view available properties" 
ON public.properties 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Authenticated users can create properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own properties" 
ON public.properties 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own properties" 
ON public.properties 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create index for location queries
CREATE INDEX idx_properties_location ON public.properties (latitude, longitude);
CREATE INDEX idx_properties_city ON public.properties (city);
CREATE INDEX idx_properties_type ON public.properties (property_type);
CREATE INDEX idx_properties_price ON public.properties (price);

-- Add trigger for updated_at
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.properties (title, description, property_type, price, area_sqm, latitude, longitude, address, bedrooms, bathrooms, features) VALUES
('Villa Moderne Centre Goma', 'Belle villa avec vue sur le lac Kivu', 'residential', 250000, 150, -1.6792, 29.2348, 'Avenue de la Paix, Centre Goma', 4, 3, ARRAY['piscine', 'jardin', 'garage']),
('Bureau Commercial Industriel', 'Espace commercial ideal pour entreprise', 'commercial', 500000, 300, -1.6850, 29.2400, 'Zone Industrielle, Goma', null, 2, ARRAY['parking', 'security', 'generator']),
('Maison Familiale Quartier Résidentiel', 'Maison parfaite pour famille', 'residential', 180000, 120, -1.6720, 29.2280, 'Quartier Lac Vert, Goma', 3, 2, ARRAY['jardin', 'terrasse']),
('Terrain Commercial Kinshasa', 'Terrain bien situé pour développement', 'land', 350000, 500, -4.4419, 15.2663, 'Boulevard du 30 Juin, Kinshasa', null, null, ARRAY['titre foncier', 'raccordements']),
('Appartement Vue Lac', 'Appartement moderne avec vue exceptionnelle', 'residential', 120000, 80, -1.6800, 29.2360, 'Avenue du Lac, Goma', 2, 1, ARRAY['vue lac', 'balcon', 'meublé']);