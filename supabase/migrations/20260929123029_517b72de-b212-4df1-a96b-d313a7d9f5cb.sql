REVOKE EXECUTE ON FUNCTION public.get_home_bic_counts() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_home_bic_counts() TO service_role;