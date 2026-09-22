-- Les codes CCC sont créés uniquement par le trigger d'approbation (SECURITY DEFINER)
DROP POLICY IF EXISTS "Authenticated users can create own codes" ON public.cadastral_contributor_codes;
DROP POLICY IF EXISTS "System can update codes" ON public.cadastral_contributor_codes;

CREATE POLICY "Admins can update codes"
ON public.cadastral_contributor_codes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

REVOKE INSERT ON public.cadastral_contributor_codes FROM authenticated;
GRANT SELECT, UPDATE ON public.cadastral_contributor_codes TO authenticated;
GRANT ALL ON public.cadastral_contributor_codes TO service_role;