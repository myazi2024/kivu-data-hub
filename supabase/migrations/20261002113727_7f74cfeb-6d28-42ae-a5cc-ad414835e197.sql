REVOKE EXECUTE ON FUNCTION public.enforce_contribution_fraud_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_suspicious_contribution() FROM PUBLIC, anon, authenticated;