-- Empêcher un utilisateur authentifié de se déclarer payé ou d'altérer le paiement d'une mutation.
CREATE OR REPLACE FUNCTION public.protect_mutation_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    RAISE EXCEPTION 'Le statut de paiement est géré exclusivement par le serveur.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_mutation_payment_status ON public.mutation_requests;
CREATE TRIGGER trg_protect_mutation_payment_status
  BEFORE UPDATE ON public.mutation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_mutation_payment_status();

-- Annulation utilisateur atomique : uniquement le propriétaire, uniquement à l'état pending.
CREATE OR REPLACE FUNCTION public.cancel_mutation_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_status TEXT;
  v_reference TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501';
  END IF;

  SELECT user_id, status, reference_number
    INTO v_owner, v_status, v_reference
  FROM public.mutation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Demande introuvable ou accès refusé' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Seules les demandes en attente peuvent être annulées.';
  END IF;

  UPDATE public.mutation_requests
     SET status = 'cancelled', updated_at = now()
   WHERE id = p_request_id AND user_id = auth.uid() AND status = 'pending';

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    auth.uid(),
    'warning',
    'Demande de mutation annulée',
    format('Votre demande de mutation %s a été annulée.', COALESCE(v_reference, '')),
    '/user-dashboard?tab=mutations'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_mutation_request(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_mutation_request(UUID) TO authenticated;

-- RPC de préremplissage : ne renvoie que le contexte cadastral utile au formulaire Mutation.
CREATE OR REPLACE FUNCTION public.get_parcel_mutation_prefill(p_parcel_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501';
  END IF;

  SELECT
    p.id,
    p.parcel_number,
    p.current_owner_name,
    p.current_owner_since,
    p.title_issue_date,
    p.is_title_in_current_owner_name,
    p.property_title_type,
    p.title_reference_number
  INTO v_row
  FROM public.cadastral_parcels p
  WHERE p.parcel_number = p_parcel_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_parcel_mutation_prefill(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parcel_mutation_prefill(TEXT) TO authenticated;