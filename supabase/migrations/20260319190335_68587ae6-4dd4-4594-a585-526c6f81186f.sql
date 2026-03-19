-- Fix detect_suspicious_contribution: change same-parcel check from 7 days to 24 hours
CREATE OR REPLACE FUNCTION public.detect_suspicious_contribution(p_user_id uuid, p_parcel_number text)
 RETURNS TABLE(is_suspicious boolean, fraud_score integer, reasons text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_suspicious BOOLEAN := false;
  v_fraud_score INTEGER := 0;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_recent_contributions INTEGER;
  v_same_parcel_count INTEGER;
  v_user_fraud_strikes INTEGER;
BEGIN
  -- Vérifier si l'utilisateur est bloqué
  SELECT fraud_strikes, is_blocked INTO v_user_fraud_strikes, v_is_suspicious
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  IF v_is_suspicious THEN
    v_reasons := array_append(v_reasons, 'Utilisateur bloqué pour fraude');
    v_fraud_score := v_fraud_score + 100;
    RETURN QUERY SELECT true, v_fraud_score, v_reasons;
    RETURN;
  END IF;
  
  -- Vérifier le nombre de contributions récentes (dernières 24h)
  SELECT COUNT(*)
  INTO v_recent_contributions
  FROM public.cadastral_contributions
  WHERE user_id = p_user_id
    AND created_at > now() - INTERVAL '24 hours';
  
  IF v_recent_contributions >= 10 THEN
    v_is_suspicious := true;
    v_fraud_score := v_fraud_score + 40;
    v_reasons := array_append(v_reasons, 'Trop de contributions en 24h: ' || v_recent_contributions);
  ELSIF v_recent_contributions >= 5 THEN
    v_fraud_score := v_fraud_score + 20;
    v_reasons := array_append(v_reasons, 'Nombre élevé de contributions: ' || v_recent_contributions);
  END IF;
  
  -- FIX: Vérifier les contributions pour la même parcelle dans les dernières 24h (était 7 jours)
  SELECT COUNT(*)
  INTO v_same_parcel_count
  FROM public.cadastral_contributions
  WHERE parcel_number = p_parcel_number
    AND created_at > now() - INTERVAL '24 hours';
  
  IF v_same_parcel_count >= 3 THEN
    v_is_suspicious := true;
    v_fraud_score := v_fraud_score + 30;
    v_reasons := array_append(v_reasons, 'Même parcelle soumise plusieurs fois en 24h: ' || v_same_parcel_count);
  END IF;
  
  -- Vérifier l'historique de fraudes de l'utilisateur
  IF v_user_fraud_strikes >= 3 THEN
    v_is_suspicious := true;
    v_fraud_score := v_fraud_score + 50;
    v_reasons := array_append(v_reasons, 'Historique de fraudes: ' || v_user_fraud_strikes || ' avertissements');
  ELSIF v_user_fraud_strikes >= 1 THEN
    v_fraud_score := v_fraud_score + 15;
    v_reasons := array_append(v_reasons, 'Avertissements précédents: ' || v_user_fraud_strikes);
  END IF;
  
  -- Si le score dépasse 50, marquer comme suspect
  IF v_fraud_score >= 50 THEN
    v_is_suspicious := true;
  END IF;
  
  RETURN QUERY SELECT v_is_suspicious, v_fraud_score, v_reasons;
END;
$function$;