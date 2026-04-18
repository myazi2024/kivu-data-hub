CREATE OR REPLACE FUNCTION public.regenerate_missing_certificates()
RETURNS TABLE(request_table text, request_id uuid, reference_number text, user_id uuid, approved_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN QUERY
  SELECT 'land_title_requests'::text, ltr.id, ltr.reference_number, ltr.user_id, ltr.updated_at
  FROM land_title_requests ltr
  LEFT JOIN document_verifications dv
    ON dv.metadata->>'request_id' = ltr.id::text
   AND dv.metadata->>'request_table' = 'land_title_requests'
  WHERE ltr.status = 'approved' AND dv.id IS NULL
  UNION ALL
  SELECT 'mutation_requests'::text, mr.id, mr.reference_number, mr.user_id, mr.updated_at
  FROM mutation_requests mr
  LEFT JOIN document_verifications dv
    ON dv.metadata->>'request_id' = mr.id::text
   AND dv.metadata->>'request_table' = 'mutation_requests'
  WHERE mr.status = 'approved' AND dv.id IS NULL;
END;
$$;