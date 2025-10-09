-- Ajouter des champs pour la lutte contre la fraude aux contributions
ALTER TABLE public.cadastral_contributions
ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fraud_reason TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Modifier la table des codes CCC pour supporter l'invalidation
ALTER TABLE public.cadastral_contributor_codes
ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invalidation_reason TEXT;

-- Créer une table pour suivre les tentatives de fraude
CREATE TABLE IF NOT EXISTS public.fraud_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_id UUID REFERENCES public.cadastral_contributions(id) ON DELETE SET NULL,
  fraud_type TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_attempts ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour fraud_attempts (seuls les admins peuvent voir)
CREATE POLICY "Only admins can view fraud attempts"
ON public.fraud_attempts
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "System can create fraud attempts"
ON public.fraud_attempts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ajouter des champs au profil utilisateur pour le blocage
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS fraud_strikes INTEGER DEFAULT 0;

-- Fonction pour détecter les contributions suspectes
CREATE OR REPLACE FUNCTION public.detect_suspicious_contribution(
  p_user_id UUID,
  p_parcel_number TEXT
)
RETURNS TABLE(is_suspicious BOOLEAN, fraud_score INTEGER, reasons TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  
  -- Vérifier les contributions pour la même parcelle
  SELECT COUNT(*)
  INTO v_same_parcel_count
  FROM public.cadastral_contributions
  WHERE parcel_number = p_parcel_number
    AND created_at > now() - INTERVAL '7 days';
  
  IF v_same_parcel_count >= 3 THEN
    v_is_suspicious := true;
    v_fraud_score := v_fraud_score + 30;
    v_reasons := array_append(v_reasons, 'Même parcelle soumise plusieurs fois: ' || v_same_parcel_count);
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
$$;

-- Fonction pour générer un code CCC seulement après approbation
CREATE OR REPLACE FUNCTION public.generate_ccc_code_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Si la contribution passe de pending à approved et qu'elle n'a pas déjà un code
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Vérifier qu'il n'y a pas déjà un code pour cette contribution
    IF NOT EXISTS (
      SELECT 1 FROM public.cadastral_contributor_codes 
      WHERE contribution_id = NEW.id
    ) THEN
      -- Générer un nouveau code
      new_code := generate_ccc_code();
      
      -- Créer le code contributeur
      INSERT INTO public.cadastral_contributor_codes (
        code,
        user_id,
        contribution_id,
        parcel_number,
        value_usd
      ) VALUES (
        new_code,
        NEW.user_id,
        NEW.id,
        NEW.parcel_number,
        5.00
      );
    END IF;
  END IF;
  
  -- Si la contribution est rejetée, invalider les codes existants
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE public.cadastral_contributor_codes
    SET is_valid = false,
        invalidated_at = now(),
        invalidation_reason = 'Contribution rejetée: ' || COALESCE(NEW.rejection_reason, 'Non spécifié')
    WHERE contribution_id = NEW.id AND is_valid = true;
    
    -- Ajouter un avertissement de fraude si c'est une fraude avérée
    IF NEW.is_suspicious THEN
      UPDATE public.profiles
      SET fraud_strikes = fraud_strikes + 1
      WHERE user_id = NEW.user_id;
      
      -- Bloquer l'utilisateur après 3 avertissements
      IF (SELECT fraud_strikes FROM public.profiles WHERE user_id = NEW.user_id) >= 3 THEN
        UPDATE public.profiles
        SET is_blocked = true,
            blocked_at = now(),
            blocked_reason = 'Trop de tentatives de fraude détectées'
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour la génération automatique de codes après approbation
DROP TRIGGER IF EXISTS trigger_generate_ccc_on_approval ON public.cadastral_contributions;
CREATE TRIGGER trigger_generate_ccc_on_approval
AFTER UPDATE ON public.cadastral_contributions
FOR EACH ROW
EXECUTE FUNCTION public.generate_ccc_code_on_approval();

-- Fonction pour valider un code CCC (mise à jour pour vérifier la validité)
CREATE OR REPLACE FUNCTION public.validate_and_apply_ccc(code_input TEXT, invoice_amount NUMERIC)
RETURNS TABLE(is_valid BOOLEAN, discount_amount NUMERIC, code_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ccc_record RECORD;
  calculated_discount NUMERIC := 0;
BEGIN
  -- Chercher le code CCC
  SELECT c.id, c.value_usd, c.is_used, c.expires_at, c.user_id, c.is_valid
  INTO ccc_record
  FROM public.cadastral_contributor_codes c
  WHERE c.code = code_input
    AND c.is_used = false
    AND c.expires_at > now()
    AND c.is_valid = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Code invalide, expiré ou déjà utilisé'::TEXT;
    RETURN;
  END IF;

  -- Vérifier que le code appartient à l'utilisateur connecté
  IF ccc_record.user_id != auth.uid() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Ce code ne vous appartient pas'::TEXT;
    RETURN;
  END IF;

  -- Calculer la remise
  calculated_discount := LEAST(ccc_record.value_usd, invoice_amount);

  RETURN QUERY SELECT true, calculated_discount, ccc_record.id, 'Code valide'::TEXT;
END;
$$;