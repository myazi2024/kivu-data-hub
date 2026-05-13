
-- 1) Fonction manquante : generate_cadastral_contributor_code (référencée par trigger auto_generate_ccc_code)
CREATE OR REPLACE FUNCTION public.generate_cadastral_contributor_code(p_contribution_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrib RECORD;
  v_code text;
  v_value numeric;
  v_id uuid;
BEGIN
  SELECT * INTO v_contrib FROM public.cadastral_contributions WHERE id = p_contribution_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution % introuvable', p_contribution_id;
  END IF;

  -- Idempotence : si un code valide existe déjà, on le retourne
  SELECT id INTO v_id
  FROM public.cadastral_contributor_codes
  WHERE contribution_id = p_contribution_id AND COALESCE(is_valid, true) = true
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  v_code := public.generate_ccc_code();
  v_value := COALESCE(public.calculate_ccc_value(p_contribution_id), 5.00);

  INSERT INTO public.cadastral_contributor_codes (
    code, user_id, contribution_id, parcel_number, value_usd
  ) VALUES (
    v_code, v_contrib.user_id, p_contribution_id, v_contrib.parcel_number, v_value
  ) RETURNING id INTO v_id;

  -- Notifier l'utilisateur (best-effort)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      v_contrib.user_id, 'success', 'Votre code CCC est disponible',
      format('Code CCC %s généré pour la parcelle %s (valeur %s USD).', v_code, v_contrib.parcel_number, v_value),
      '/user-dashboard?tab=ccc-codes'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'CCC notification skipped: % %', SQLERRM, SQLSTATE;
  END;

  RETURN v_id;
END;
$$;

-- 2) Durcir auto_generate_ccc_code : log + re-raise pour ne plus avaler l'erreur d'approbation
CREATE OR REPLACE FUNCTION public.auto_generate_ccc_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'
     AND (OLD.status IS DISTINCT FROM 'approved') THEN
    BEGIN
      PERFORM public.generate_cadastral_contributor_code(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'auto_generate_ccc_code failed for %: % %', NEW.id, SQLERRM, SQLSTATE;
      RAISE;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Nettoyage des doublons
DROP TRIGGER IF EXISTS normalize_contribution_empty_strings_trg ON public.cadastral_contributions;
DROP INDEX IF EXISTS public.idx_unique_active_contribution_per_user_parcel;

-- 4) Index admin (statut + date) — accélère la liste paginée Admin CCC
CREATE INDEX IF NOT EXISTS idx_cadastral_contributions_status_created_desc
  ON public.cadastral_contributions (status, created_at DESC);

-- 5) RLS admin update : ajouter WITH CHECK explicite
DROP POLICY IF EXISTS "Admins can update contributions" ON public.cadastral_contributions;
CREATE POLICY "Admins can update contributions"
  ON public.cadastral_contributions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 6) RPC d'approbation atomique (consolide trigger BEFORE/AFTER + INSERT front)
CREATE OR REPLACE FUNCTION public.approve_ccc_contribution(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé: rôle administrateur requis';
  END IF;

  UPDATE public.cadastral_contributions
  SET status = 'approved',
      reviewed_by = v_uid,
      reviewed_at = now(),
      verified_by = v_uid,
      verified_at = now()
  WHERE id = p_id AND status IN ('pending','returned','in_review');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution % introuvable ou déjà traitée', p_id;
  END IF;

  RETURN p_id;
END;
$$;

-- 7) RPC de rejet motivé (atomique, côté admin)
CREATE OR REPLACE FUNCTION public.reject_ccc_contribution(p_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_parcel text;
BEGIN
  IF NOT (public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé: rôle administrateur requis';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Motif de rejet obligatoire (min 5 caractères)';
  END IF;

  UPDATE public.cadastral_contributions
  SET status = 'rejected',
      rejection_reason = p_reason,
      rejected_by = v_uid,
      rejection_date = now(),
      reviewed_by = v_uid,
      reviewed_at = now()
  WHERE id = p_id AND status IN ('pending','returned','in_review')
  RETURNING user_id, parcel_number INTO v_user_id, v_parcel;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution % introuvable ou déjà traitée', p_id;
  END IF;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (v_user_id, 'error', 'Contribution rejetée',
      format('Votre contribution pour la parcelle %s a été rejetée. Motif: %s', v_parcel, p_reason),
      '/user-dashboard?tab=contributions');
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'CCC reject notification skipped: % %', SQLERRM, SQLSTATE;
  END;

  RETURN p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_ccc_contribution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_ccc_contribution(uuid, text) TO authenticated;
