-- Add document URL fields to cadastral_contributions table
ALTER TABLE cadastral_contributions 
ADD COLUMN owner_document_url TEXT,
ADD COLUMN property_title_document_url TEXT;

-- Create storage bucket for cadastral documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cadastral-documents', 'cadastral-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for cadastral documents bucket

-- Policy: Anyone can view cadastral documents
CREATE POLICY "Cadastral documents are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'cadastral-documents');

-- Policy: Authenticated users can upload their own documents
CREATE POLICY "Users can upload cadastral documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cadastral-documents' 
  AND auth.uid() IS NOT NULL
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their cadastral documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cadastral-documents' 
  AND auth.uid() IS NOT NULL
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their cadastral documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cadastral-documents' 
  AND auth.uid() IS NOT NULL
);