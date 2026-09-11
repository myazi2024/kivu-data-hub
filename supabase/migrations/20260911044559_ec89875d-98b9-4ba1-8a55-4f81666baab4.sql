CREATE OR REPLACE FUNCTION public.prevent_client_expertise_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.paid_at := NULL;
    NEW.receipt_url := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id
     OR NEW.total_amount_usd IS DISTINCT FROM OLD.total_amount_usd
     OR NEW.receipt_url IS DISTINCT FROM OLD.receipt_url THEN
    RAISE EXCEPTION 'Modification interdite: le statut et les montants de paiement sont gérés côté serveur uniquement';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_expertise_payment_fields_ins ON public.expertise_payments;
CREATE TRIGGER trg_prevent_client_expertise_payment_fields_ins
BEFORE INSERT ON public.expertise_payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_client_expertise_payment_fields();

DROP TRIGGER IF EXISTS trg_prevent_client_expertise_payment_fields_upd ON public.expertise_payments;
CREATE TRIGGER trg_prevent_client_expertise_payment_fields_upd
BEFORE UPDATE ON public.expertise_payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_client_expertise_payment_fields();

DROP POLICY IF EXISTS "Users can update their own expertise payments" ON public.expertise_payments;
CREATE POLICY "Users can update their own pending expertise payments"
ON public.expertise_payments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');