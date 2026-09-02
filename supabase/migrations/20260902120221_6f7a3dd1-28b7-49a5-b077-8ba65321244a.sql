ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_cadastral_contributions_payment_transaction
  ON public.cadastral_contributions(payment_transaction_id);

CREATE OR REPLACE FUNCTION public.protect_mortgage_cancellation_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_privileged BOOLEAN := auth.role() = 'service_role'
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role);
BEGIN
  IF NEW.contribution_type <> 'mortgage_cancellation' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_privileged
       AND (NEW.status <> 'awaiting_payment' OR NEW.payment_status <> 'pending') THEN
      RAISE EXCEPTION 'Une demande de radiation doit être créée en attente de paiement.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT v_is_privileged
     AND (NEW.status IS DISTINCT FROM OLD.status
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_transaction_id IS DISTINCT FROM OLD.payment_transaction_id
       OR NEW.payment_confirmed_at IS DISTINCT FROM OLD.payment_confirmed_at) THEN
    RAISE EXCEPTION 'Le statut de paiement de la radiation est géré exclusivement par le serveur.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_mortgage_cancellation_payment
  ON public.cadastral_contributions;
CREATE TRIGGER trg_protect_mortgage_cancellation_payment
  BEFORE INSERT OR UPDATE ON public.cadastral_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_mortgage_cancellation_payment();

DROP POLICY IF EXISTS "Authenticated users can view mortgages" ON public.cadastral_mortgages;
DROP POLICY IF EXISTS "Cadastral mortgages are viewable by everyone" ON public.cadastral_mortgages;
CREATE POLICY "Owners and admins can view mortgages"
ON public.cadastral_mortgages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.cadastral_contributions c
    WHERE c.original_parcel_id = cadastral_mortgages.parcel_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can upload mortgage registration documents" ON storage.objects;
CREATE POLICY "Users can upload mortgage registration documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cadastral-documents'
  AND (storage.foldername(name))[1] = 'mortgage-documents'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload mortgage cancellation documents" ON storage.objects;
CREATE POLICY "Users can upload mortgage cancellation documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cadastral-documents'
  AND (storage.foldername(name))[1] = 'mortgage-cancellation'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own mortgage documents" ON storage.objects;
CREATE POLICY "Users can view own mortgage documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cadastral-documents'
  AND (
    ((storage.foldername(name))[1] IN ('mortgage-documents', 'mortgage-cancellation')
      AND (storage.foldername(name))[2] = auth.uid()::text)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);