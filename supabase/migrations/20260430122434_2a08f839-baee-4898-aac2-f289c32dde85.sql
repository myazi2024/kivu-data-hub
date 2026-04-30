REVOKE EXECUTE ON FUNCTION public.get_admin_expertise_stats(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_signed_expertise_certificate(UUID, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_expertise_request(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.escalate_expertise_request(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_expertise_request(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_expertise_request(UUID, NUMERIC, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM anon;