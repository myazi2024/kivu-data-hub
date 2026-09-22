CREATE OR REPLACE FUNCTION public.protect_contribution_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_detect RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    NEW.status := OLD.status;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.verified_by := OLD.verified_by;
    NEW.original_parcel_id := OLD.original_parcel_id;
    NEW.user_id := OLD.user_id;

    -- Recalcul serveur du score de suspicion à chaque modification utilisateur :
    -- l'utilisateur ne peut pas l'imposer, mais il ne reste pas figé non plus.
    BEGIN
      SELECT * INTO v_detect
      FROM public.detect_suspicious_contribution(NEW.user_id, NEW.parcel_number)
      LIMIT 1;
      IF FOUND THEN
        NEW.is_suspicious := v_detect.is_suspicious;
        NEW.fraud_score := v_detect.fraud_score;
      ELSE
        NEW.is_suspicious := OLD.is_suspicious;
        NEW.fraud_score := OLD.fraud_score;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NEW.is_suspicious := OLD.is_suspicious;
      NEW.fraud_score := OLD.fraud_score;
    END;
  END IF;
  RETURN NEW;
END;
$$;