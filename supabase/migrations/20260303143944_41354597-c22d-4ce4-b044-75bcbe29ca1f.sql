-- Create storage bucket for expertise certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('expertise-certificates', 'expertise-certificates', true);

-- Allow public to read expertise certificates
CREATE POLICY "Public can read expertise certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'expertise-certificates');

-- Allow admins to upload expertise certificates
CREATE POLICY "Admins can upload expertise certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'expertise-certificates' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Allow admins to delete expertise certificates
CREATE POLICY "Admins can delete expertise certificates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'expertise-certificates' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);