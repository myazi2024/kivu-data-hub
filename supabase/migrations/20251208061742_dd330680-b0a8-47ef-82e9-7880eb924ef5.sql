-- Create RLS policy for mutation documents upload
CREATE POLICY "Users can upload mutation documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cadastral-documents' AND
  (storage.foldername(name))[1] = 'mutation-documents' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Create RLS policy for users to view their own mutation documents
CREATE POLICY "Users can view their own mutation documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cadastral-documents' AND
  (storage.foldername(name))[1] = 'mutation-documents' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Create RLS policy for users to delete their own mutation documents
CREATE POLICY "Users can delete their own mutation documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cadastral-documents' AND
  (storage.foldername(name))[1] = 'mutation-documents' AND
  (storage.foldername(name))[2] = auth.uid()::text
);