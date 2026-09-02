REVOKE EXECUTE ON FUNCTION public.protect_mortgage_cancellation_payment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_mortgage_cancellation_payment() TO service_role;