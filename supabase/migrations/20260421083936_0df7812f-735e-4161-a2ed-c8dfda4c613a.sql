CREATE OR REPLACE FUNCTION public.sync_invoice_on_tx_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.invoice_id IS NOT NULL THEN
    UPDATE public.cadastral_invoices
       SET status = 'paid',
           updated_at = now()
     WHERE id = NEW.invoice_id
       AND status <> 'paid';
  END IF;
  RETURN NEW;
END;
$$;