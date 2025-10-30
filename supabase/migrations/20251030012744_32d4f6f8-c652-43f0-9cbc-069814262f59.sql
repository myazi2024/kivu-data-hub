-- Ajouter les champs nécessaires pour le système de contributions collaboratives

-- 1. Ajouter le type de contribution à la table cadastral_contributions
ALTER TABLE public.cadastral_contributions 
ADD COLUMN IF NOT EXISTS contribution_type TEXT NOT NULL DEFAULT 'new',
ADD COLUMN IF NOT EXISTS original_parcel_id UUID REFERENCES public.cadastral_parcels(id),
ADD COLUMN IF NOT EXISTS changed_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS change_justification TEXT;

-- 2. Ajouter un commentaire pour documenter les valeurs possibles
COMMENT ON COLUMN public.cadastral_contributions.contribution_type IS 'Type de contribution: new (nouvelle parcelle) ou update (mise à jour parcelle existante)';

-- 3. Créer un index pour optimiser les requêtes de contributions par parcelle
CREATE INDEX IF NOT EXISTS idx_contributions_original_parcel 
ON public.cadastral_contributions(original_parcel_id) 
WHERE original_parcel_id IS NOT NULL;

-- 4. Fonction pour détecter les abus de contributions répétées
CREATE OR REPLACE FUNCTION public.check_contribution_abuse(
  p_user_id UUID,
  p_parcel_id UUID DEFAULT NULL
)
RETURNS TABLE(
  is_abuse BOOLEAN,
  reason TEXT,
  recent_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_recent_count INTEGER;
  v_parcel_count INTEGER;
BEGIN
  -- Compter les contributions des dernières 24h
  SELECT COUNT(*) INTO v_recent_count
  FROM public.cadastral_contributions
  WHERE user_id = p_user_id
    AND created_at > now() - INTERVAL '24 hours';
  
  -- Si une parcelle spécifique est fournie, compter les contributions sur cette parcelle
  IF p_parcel_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_parcel_count
    FROM public.cadastral_contributions
    WHERE user_id = p_user_id
      AND original_parcel_id = p_parcel_id
      AND created_at > now() - INTERVAL '24 hours';
    
    -- Limite: 3 contributions par parcelle par jour
    IF v_parcel_count >= 3 THEN
      RETURN QUERY SELECT 
        true,
        'Vous avez atteint la limite de 3 contributions par parcelle en 24h',
        v_recent_count;
      RETURN;
    END IF;
  END IF;
  
  -- Limite globale: 10 contributions par jour
  IF v_recent_count >= 10 THEN
    RETURN QUERY SELECT 
      true,
      'Vous avez atteint la limite de 10 contributions en 24h',
      v_recent_count;
    RETURN;
  END IF;
  
  -- Pas d'abus détecté
  RETURN QUERY SELECT 
    false,
    'Contribution autorisée'::TEXT,
    v_recent_count;
END;
$$;

-- 5. Fonction pour obtenir l'historique des contributions sur une parcelle
CREATE OR REPLACE FUNCTION public.get_parcel_contribution_history(
  p_parcel_id UUID
)
RETURNS TABLE(
  contribution_id UUID,
  user_id UUID,
  contributor_name TEXT,
  contribution_type TEXT,
  status TEXT,
  changed_fields JSONB,
  change_justification TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    cc.id,
    cc.user_id,
    p.full_name,
    cc.contribution_type,
    cc.status,
    cc.changed_fields,
    cc.change_justification,
    cc.created_at,
    cc.reviewed_at
  FROM public.cadastral_contributions cc
  LEFT JOIN public.profiles p ON p.user_id = cc.user_id
  WHERE cc.original_parcel_id = p_parcel_id
    OR cc.parcel_number = (
      SELECT parcel_number 
      FROM public.cadastral_parcels 
      WHERE id = p_parcel_id
    )
  ORDER BY cc.created_at DESC
  LIMIT 50;
$$;