CREATE OR REPLACE FUNCTION public.enforce_contribution_fraud_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record;
BEGIN
  IF public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.parcel_number IS NOT DISTINCT FROM OLD.parcel_number
     AND NEW.is_suspicious IS NOT DISTINCT FROM OLD.is_suspicious
     AND NEW.fraud_score IS NOT DISTINCT FROM OLD.fraud_score
     AND NEW.fraud_reason IS NOT DISTINCT FROM OLD.fraud_reason THEN
    RETURN NEW;
  END IF;
  SELECT * INTO d FROM public.detect_suspicious_contribution(NEW.user_id, NEW.parcel_number) LIMIT 1;
  NEW.is_suspicious := coalesce(d.is_suspicious,false);
  NEW.fraud_score := coalesce(d.fraud_score,0);
  NEW.fraud_reason := nullif(array_to_string(coalesce(d.reasons,'{}'::text[]),'; '),'');
  IF TG_OP = 'INSERT' AND NEW.is_suspicious AND NEW.fraud_score >= 80 THEN
    RAISE EXCEPTION 'Contribution suspecte : elle a été signalée pour vérification.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS aab_enforce_contribution_fraud_score ON public.cadastral_contributions;
CREATE TRIGGER aab_enforce_contribution_fraud_score
BEFORE INSERT OR UPDATE ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_contribution_fraud_score();

CREATE OR REPLACE FUNCTION public.log_suspicious_contribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_suspicious AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.fraud_attempts(user_id, contribution_id, fraud_type, description, severity)
    VALUES (NEW.user_id, NEW.id, 'suspicious_contribution', NEW.fraud_reason,
      CASE WHEN NEW.fraud_score >= 50 THEN 'high' ELSE 'medium' END);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS zz_log_suspicious_contribution ON public.cadastral_contributions;
CREATE TRIGGER zz_log_suspicious_contribution
AFTER INSERT ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.log_suspicious_contribution();