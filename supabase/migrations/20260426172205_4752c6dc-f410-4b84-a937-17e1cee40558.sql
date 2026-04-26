-- Table partners : autoriser admin ET super_admin
DROP POLICY IF EXISTS "Admin gère les partenaires" ON public.partners;

CREATE POLICY "Admins gèrent les partenaires"
ON public.partners
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Bucket Storage partners : idem
DROP POLICY IF EXISTS "Admin upload partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin update partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete partner logos" ON storage.objects;

CREATE POLICY "Admins upload partner logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'partners'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Admins update partner logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'partners'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Admins delete partner logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'partners'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);