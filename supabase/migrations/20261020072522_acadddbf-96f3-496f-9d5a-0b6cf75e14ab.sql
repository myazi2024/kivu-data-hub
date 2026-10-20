
ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS submitter_role text NOT NULL DEFAULT 'contributor',
  ADD COLUMN IF NOT EXISTS owner_exploitation_proofs jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.cadastral_contributions
  ADD CONSTRAINT cadastral_contributions_submitter_role_chk CHECK (submitter_role IN ('contributor','owner'));

ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS owner_linked_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_cadastral_parcels_owner_user ON public.cadastral_parcels(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Helper: est-ce le propriétaire de compte validé ?
CREATE OR REPLACE FUNCTION public.is_parcel_account_owner(p_parcel_number text, p_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.cadastral_parcels
    WHERE parcel_number = p_parcel_number AND owner_user_id = p_user AND p_user IS NOT NULL AND deleted_at IS NULL);
$$;
REVOKE ALL ON FUNCTION public.is_parcel_account_owner(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parcel_account_owner(text, uuid) TO authenticated, service_role;

-- Validation des proofs (tableau d'objets {kind, path, name} dans le dossier de l'utilisateur)
CREATE OR REPLACE FUNCTION public._valid_ownership_docs(p_docs jsonb, p_user uuid, p_kinds text[], p_min int)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE d jsonb; n int := 0;
BEGIN
  IF p_docs IS NULL OR jsonb_typeof(p_docs) <> 'array' THEN RETURN p_min = 0; END IF;
  IF jsonb_array_length(p_docs) > 10 THEN RETURN false; END IF;
  FOR d IN SELECT * FROM jsonb_array_elements(p_docs) LOOP
    IF jsonb_typeof(d) <> 'object'
       OR coalesce(d->>'path','') NOT LIKE p_user::text || '/%'
       OR NOT (coalesce(d->>'kind','') = ANY (p_kinds)) THEN
      RETURN false;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n >= p_min;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_ccc_owner_declaration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_admin boolean := public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]);
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NOT v_admin AND auth.uid() IS NOT NULL THEN
      NEW.submitter_role := OLD.submitter_role;
      NEW.owner_exploitation_proofs := OLD.owner_exploitation_proofs;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.submitter_role = 'owner' THEN
    IF NOT public._valid_ownership_docs(NEW.owner_exploitation_proofs, NEW.user_id,
         ARRAY['water_bill','electricity_bill','tax_receipt','payment_certificate'], 1) THEN
      RAISE EXCEPTION 'Au moins un justificatif d''exploitation récent est requis pour soumettre en tant que propriétaire';
    END IF;
    SELECT owner_user_id INTO v_owner FROM public.cadastral_parcels
      WHERE parcel_number = NEW.parcel_number AND deleted_at IS NULL LIMIT 1;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
      RAISE EXCEPTION 'Cette parcelle a déjà un propriétaire validé. Utilisez « Revendiquer une parcelle » depuis votre espace.';
    END IF;
  ELSE
    NEW.owner_exploitation_proofs := '[]'::jsonb;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_ccc_owner_declaration ON public.cadastral_contributions;
CREATE TRIGGER trg_enforce_ccc_owner_declaration BEFORE INSERT OR UPDATE ON public.cadastral_contributions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ccc_owner_declaration();

CREATE OR REPLACE FUNCTION public.approve_ccc_contribution(p_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_c record;
BEGIN
  IF NOT (public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé: rôle administrateur requis';
  END IF;

  UPDATE public.cadastral_contributions
  SET status = 'approved', reviewed_by = v_uid, reviewed_at = now(), verified_by = v_uid, verified_at = now()
  WHERE id = p_id AND status IN ('pending','returned','in_review')
  RETURNING user_id, parcel_number, submitter_role INTO v_c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution % introuvable ou déjà traitée', p_id;
  END IF;

  IF v_c.submitter_role = 'owner' THEN
    UPDATE public.cadastral_parcels
       SET owner_user_id = v_c.user_id, owner_linked_at = now()
     WHERE parcel_number = v_c.parcel_number AND deleted_at IS NULL AND owner_user_id IS NULL;
    IF FOUND THEN
      PERFORM public._notify(v_c.user_id, 'Parcelle ajoutée à « Mes parcelles »',
        'Votre déclaration de propriétaire pour la parcelle ' || v_c.parcel_number || ' a été validée.',
        'success', '/mon-compte?tab=my-parcels', 'ccc_owner:' || p_id::text);
    END IF;
  END IF;

  RETURN p_id;
END;
$function$;

-- Demandes de modification : propriétaire validé uniquement
DROP POLICY IF EXISTS "Owners create requests on approved contributions" ON public.ccc_correction_requests;
CREATE POLICY "Owners create requests on approved contributions" ON public.ccc_correction_requests
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND status = 'pending' AND reviewed_at IS NULL
  AND length(trim(reason)) >= 5 AND jsonb_typeof(changes) = 'array'
  AND jsonb_array_length(changes) BETWEEN 1 AND 30
  AND EXISTS (SELECT 1 FROM public.cadastral_contributions c
              WHERE c.id = ccc_correction_requests.contribution_id AND c.user_id = auth.uid()
                AND c.status = 'approved' AND public.is_parcel_account_owner(c.parcel_number, auth.uid()))
);

-- Revendications
CREATE TABLE public.parcel_ownership_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid NOT NULL REFERENCES public.cadastral_parcels(id) ON DELETE CASCADE,
  parcel_number text NOT NULL,
  user_id uuid NOT NULL,
  claim_type text NOT NULL CHECK (claim_type IN ('contribution','contest')),
  previous_owner_user_id uuid,
  identity_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  rights_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  exploitation_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  statement text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected','cancelled')),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parcel_ownership_claims TO authenticated;
GRANT ALL ON public.parcel_ownership_claims TO service_role;
ALTER TABLE public.parcel_ownership_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Claim author or admin reads" ON public.parcel_ownership_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));
CREATE UNIQUE INDEX uq_ownership_claim_active ON public.parcel_ownership_claims(parcel_id, user_id) WHERE status IN ('pending','in_review');
CREATE INDEX idx_ownership_claims_user ON public.parcel_ownership_claims(user_id, created_at DESC);
CREATE INDEX idx_ownership_claims_status ON public.parcel_ownership_claims(status, created_at DESC);
CREATE TRIGGER trg_ownership_claims_updated BEFORE UPDATE ON public.parcel_ownership_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.search_claimable_parcels(p_term text)
RETURNS TABLE(parcel_number text, province text, ville text, commune text, claim_type text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF length(trim(coalesce(p_term,''))) < 3 THEN RETURN; END IF;
  RETURN QUERY
    SELECT p.parcel_number, p.province, p.ville, p.commune,
           CASE WHEN p.owner_user_id IS NULL THEN 'contribution' ELSE 'contest' END
    FROM public.cadastral_parcels p
    WHERE p.deleted_at IS NULL
      AND (p.owner_user_id IS NULL OR p.owner_user_id <> auth.uid())
      AND p.parcel_number ILIKE replace(replace(replace(trim(p_term),'\','\\'),'%','\%'),'_','\_') || '%'
    ORDER BY p.parcel_number LIMIT 20;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_owned_parcels()
RETURNS TABLE(id uuid, parcel_number text, province text, ville text, commune text, quartier text, area_sqm numeric, owner_linked_at timestamptz, contribution_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.parcel_number, p.province, p.ville, p.commune, p.quartier, p.area_sqm::numeric, p.owner_linked_at,
    (SELECT c.id FROM public.cadastral_contributions c
      WHERE c.parcel_number = p.parcel_number AND c.user_id = auth.uid() AND c.status = 'approved'
      ORDER BY c.created_at DESC LIMIT 1)
  FROM public.cadastral_parcels p
  WHERE auth.uid() IS NOT NULL AND p.owner_user_id = auth.uid() AND p.deleted_at IS NULL
  ORDER BY p.owner_linked_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.submit_ownership_claim(
  p_parcel_number text, p_identity_docs jsonb, p_rights_docs jsonb, p_exploitation_docs jsonb, p_statement text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_p record; v_type text; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT id, parcel_number, owner_user_id INTO v_p FROM public.cadastral_parcels
    WHERE parcel_number = trim(p_parcel_number) AND deleted_at IS NULL LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcelle introuvable'; END IF;
  IF v_p.owner_user_id = v_uid THEN RAISE EXCEPTION 'Cette parcelle est déjà gérée par votre compte'; END IF;
  v_type := CASE WHEN v_p.owner_user_id IS NULL THEN 'contribution' ELSE 'contest' END;

  IF NOT public._valid_ownership_docs(p_identity_docs, v_uid, ARRAY['identity'], 1) THEN
    RAISE EXCEPTION 'Une copie de votre pièce d''identité est requise';
  END IF;
  IF v_type = 'contest' THEN
    IF NOT public._valid_ownership_docs(p_rights_docs, v_uid, ARRAY['title','contract','court_decision','other_right'], 1) THEN
      RAISE EXCEPTION 'Au moins une preuve de vos droits sur la parcelle est requise';
    END IF;
    IF NOT public._valid_ownership_docs(p_exploitation_docs, v_uid, ARRAY['water_bill','electricity_bill','tax_receipt','payment_certificate'], 1) THEN
      RAISE EXCEPTION 'Au moins une preuve d''exploitation récente est requise';
    END IF;
    IF length(trim(coalesce(p_statement,''))) < 20 THEN
      RAISE EXCEPTION 'Expliquez votre revendication (20 caractères minimum)';
    END IF;
  ELSE
    p_rights_docs := '[]'::jsonb; p_exploitation_docs := '[]'::jsonb;
  END IF;
  IF length(coalesce(p_statement,'')) > 2000 THEN RAISE EXCEPTION 'Explication trop longue'; END IF;

  IF EXISTS (SELECT 1 FROM public.parcel_ownership_claims
             WHERE parcel_id = v_p.id AND user_id = v_uid AND status IN ('pending','in_review')) THEN
    RAISE EXCEPTION 'Vous avez déjà une revendication en cours pour cette parcelle';
  END IF;

  INSERT INTO public.parcel_ownership_claims(parcel_id, parcel_number, user_id, claim_type, previous_owner_user_id,
    identity_docs, rights_docs, exploitation_docs, statement)
  VALUES (v_p.id, v_p.parcel_number, v_uid, v_type, v_p.owner_user_id,
    p_identity_docs, coalesce(p_rights_docs,'[]'::jsonb), coalesce(p_exploitation_docs,'[]'::jsonb), nullif(trim(p_statement),''))
  RETURNING id INTO v_id;

  IF v_type = 'contest' THEN
    PERFORM public._notify(v_p.owner_user_id, 'Revendication sur votre parcelle',
      'Une personne revendique la propriété de la parcelle ' || v_p.parcel_number || '. Un administrateur examinera le dossier ; vous pouvez être contacté pour fournir vos justificatifs.',
      'warning', '/mon-compte?tab=my-parcels', 'claim_contest:' || v_id::text);
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_ownership_claim(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.parcel_ownership_claims SET status = 'cancelled'
   WHERE id = p_id AND user_id = auth.uid() AND status IN ('pending','in_review');
  IF NOT FOUND THEN RAISE EXCEPTION 'Revendication introuvable ou déjà traitée'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.process_ownership_claim_decision(p_id uuid, p_action text, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_c record; v_uid uuid := auth.uid();
BEGIN
  PERFORM public._require_admin();
  SELECT * INTO v_c FROM public.parcel_ownership_claims WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revendication introuvable'; END IF;

  IF p_action = 'in_review' THEN
    IF v_c.status <> 'pending' THEN RAISE EXCEPTION 'Revendication déjà traitée'; END IF;
    UPDATE public.parcel_ownership_claims SET status = 'in_review', reviewed_by = v_uid WHERE id = p_id;
    RETURN;
  END IF;
  IF v_c.status NOT IN ('pending','in_review') THEN RAISE EXCEPTION 'Revendication déjà traitée'; END IF;

  IF p_action = 'approve' THEN
    UPDATE public.cadastral_parcels SET owner_user_id = v_c.user_id, owner_linked_at = now()
      WHERE id = v_c.parcel_id;
    UPDATE public.parcel_ownership_claims SET status = 'approved', reviewed_by = v_uid, reviewed_at = now() WHERE id = p_id;
    -- autres revendications en cours sur la parcelle : rejetées
    UPDATE public.parcel_ownership_claims SET status = 'rejected', reviewed_by = v_uid, reviewed_at = now(),
      rejection_reason = 'Une autre revendication a été approuvée pour cette parcelle.'
      WHERE parcel_id = v_c.parcel_id AND id <> p_id AND status IN ('pending','in_review');
    PERFORM public._notify(v_c.user_id, 'Revendication approuvée',
      'La parcelle ' || v_c.parcel_number || ' est maintenant gérée par votre compte.', 'success',
      '/mon-compte?tab=my-parcels', 'claim:' || p_id::text || ':approve');
    IF v_c.previous_owner_user_id IS NOT NULL AND v_c.previous_owner_user_id <> v_c.user_id THEN
      PERFORM public._notify(v_c.previous_owner_user_id, 'Gestion de parcelle transférée',
        'Après examen, la gestion de la parcelle ' || v_c.parcel_number || ' a été transférée à un autre compte. Contactez le support pour toute contestation.',
        'warning', '/mon-compte?tab=my-parcels', 'claim:' || p_id::text || ':previous');
    END IF;
  ELSIF p_action = 'reject' THEN
    IF length(trim(coalesce(p_reason,''))) < 5 THEN RAISE EXCEPTION 'Motif de refus requis'; END IF;
    UPDATE public.parcel_ownership_claims SET status = 'rejected', rejection_reason = trim(p_reason),
      reviewed_by = v_uid, reviewed_at = now() WHERE id = p_id;
    PERFORM public._notify(v_c.user_id, 'Revendication refusée',
      'Votre revendication sur la parcelle ' || v_c.parcel_number || ' a été refusée : ' || left(trim(p_reason), 1500),
      'error', '/mon-compte?tab=ownership-claims', 'claim:' || p_id::text || ':reject');
  ELSE
    RAISE EXCEPTION 'Action inconnue';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.search_claimable_parcels(text), public.get_my_owned_parcels(),
  public.submit_ownership_claim(text,jsonb,jsonb,jsonb,text), public.cancel_ownership_claim(uuid),
  public.process_ownership_claim_decision(uuid,text,text), public._valid_ownership_docs(jsonb,uuid,text[],int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_claimable_parcels(text), public.get_my_owned_parcels(),
  public.submit_ownership_claim(text,jsonb,jsonb,jsonb,text), public.cancel_ownership_claim(uuid),
  public.process_ownership_claim_decision(uuid,text,text) TO authenticated, service_role;

-- Stockage
CREATE POLICY "ownership proofs upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ownership-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "ownership proofs read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ownership-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[])));
CREATE POLICY "ownership proofs delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ownership-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
