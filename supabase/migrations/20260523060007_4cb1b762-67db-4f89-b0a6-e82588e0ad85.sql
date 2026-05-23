-- Subdivision certificate signed URL (private bucket: expertise-certificates)
CREATE OR REPLACE FUNCTION public.get_signed_subdivision_certificate(
  p_request_id uuid,
  p_ttl_seconds integer DEFAULT 600
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  v_owner uuid;
  v_url   text;
  v_path  text;
  v_signed RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT sr.user_id, gc.certificate_url
    INTO v_owner, v_url
  FROM public.subdivision_requests sr
  LEFT JOIN LATERAL (
    SELECT certificate_url
    FROM public.generated_certificates
    WHERE request_id = sr.id
      AND certificate_type = 'lotissement'
    ORDER BY generated_at DESC
    LIMIT 1
  ) gc ON TRUE
  WHERE sr.id = p_request_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_url IS NULL OR length(trim(v_url)) = 0 THEN
    RAISE EXCEPTION 'CERT_NOT_GENERATED';
  END IF;

  IF auth.uid() <> v_owner
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_path := regexp_replace(v_url, '^.*/expertise-certificates/', '');
  v_path := regexp_replace(v_path, '^.*/object/(public|sign)/expertise-certificates/', '');

  SELECT * INTO v_signed
  FROM storage.create_signed_url('expertise-certificates', v_path, p_ttl_seconds);
  RETURN v_signed.signed_url;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signed_subdivision_certificate(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signed_subdivision_certificate(uuid, integer) TO authenticated;

-- Server-side admin stats (no 1000-row cap)
CREATE OR REPLACE FUNCTION public.get_subdivision_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'in_review', COUNT(*) FILTER (WHERE status = 'in_review'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'returned', COUNT(*) FILTER (WHERE status = 'returned'),
    'awaiting_payment', COUNT(*) FILTER (WHERE status = 'awaiting_payment'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'escalated', COUNT(*) FILTER (WHERE escalated IS TRUE),
    'submission_paid', COUNT(*) FILTER (WHERE submission_payment_status = 'paid'),
    'final_paid', COUNT(*) FILTER (WHERE final_payment_status = 'paid'),
    'revenue_usd', COALESCE(SUM(CASE WHEN final_payment_status = 'paid' THEN total_amount_usd ELSE 0 END), 0),
    'lots_total', COALESCE(SUM(number_of_lots), 0),
    'last_7d', COUNT(*) FILTER (WHERE created_at > now() - interval '7 days'),
    'last_30d', COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')
  )
  INTO v_result
  FROM public.subdivision_requests;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_subdivision_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subdivision_admin_stats() TO authenticated;