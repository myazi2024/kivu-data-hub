-- Create a public view for properties without sensitive contact information
CREATE VIEW public.properties_public AS
SELECT 
  id,
  title,
  description,
  property_type,
  price,
  currency,
  area_sqm,
  bedrooms,
  bathrooms,
  parking_spaces,
  address,
  city,
  province,
  country,
  latitude,
  longitude,
  is_available,
  image_urls,
  features,
  created_at,
  updated_at
FROM public.properties
WHERE is_available = true;

-- Enable RLS on the view
ALTER VIEW public.properties_public SET (security_invoker = on);

-- Update the existing policy to be more restrictive for contact information
DROP POLICY IF EXISTS "Anyone can view available properties" ON public.properties;

-- Create new policies with restricted access to sensitive data
CREATE POLICY "Anyone can view basic property info" 
ON public.properties 
FOR SELECT 
USING (
  is_available = true AND 
  current_setting('request.jwt.claims', true)::json->>'role' IS NULL
);

-- Allow authenticated users to see contact info for available properties
CREATE POLICY "Authenticated users can view full property details" 
ON public.properties 
FOR SELECT 
USING (
  is_available = true AND 
  auth.uid() IS NOT NULL
);

-- Property owners can always see their own properties with full details
CREATE POLICY "Owners can view their own properties" 
ON public.properties 
FOR SELECT 
USING (auth.uid() = created_by);

-- Grant SELECT permission on the public view to anonymous users
GRANT SELECT ON public.properties_public TO anon;
GRANT SELECT ON public.properties_public TO authenticated;