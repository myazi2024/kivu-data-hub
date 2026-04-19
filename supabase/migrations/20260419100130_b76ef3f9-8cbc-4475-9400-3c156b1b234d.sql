-- 1) Backfill des accès manquants pour toutes les factures payées
INSERT INTO public.cadastral_service_access (user_id, invoice_id, parcel_number, service_type)
SELECT
  inv.user_id,
  inv.id,
  inv.parcel_number,
  svc.service_type
FROM public.cadastral_invoices inv
CROSS JOIN LATERAL (
  SELECT jsonb_array_elements_text(
    CASE
      WHEN jsonb_typeof(inv.selected_services) = 'array' THEN inv.selected_services
      ELSE '[]'::jsonb
    END
  ) AS service_type
) svc
WHERE inv.status = 'paid'
  AND inv.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.cadastral_service_access acc
    WHERE acc.user_id = inv.user_id
      AND acc.parcel_number = inv.parcel_number
      AND acc.service_type = svc.service_type
  );

-- 2) Fonction trigger : provisionne automatiquement les accès quand status devient 'paid'
CREATE OR REPLACE FUNCTION public.provision_service_access_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid')
     AND NEW.user_id IS NOT NULL
  THEN
    INSERT INTO public.cadastral_service_access (user_id, invoice_id, parcel_number, service_type)
    SELECT
      NEW.user_id,
      NEW.id,
      NEW.parcel_number,
      svc.service_type
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(NEW.selected_services) = 'array' THEN NEW.selected_services
        ELSE '[]'::jsonb
      END
    ) AS svc(service_type)
    ON CONFLICT (user_id, parcel_number, service_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Trigger sur cadastral_invoices (INSERT + UPDATE)
DROP TRIGGER IF EXISTS trg_provision_service_access_on_paid ON public.cadastral_invoices;
CREATE TRIGGER trg_provision_service_access_on_paid
AFTER INSERT OR UPDATE OF status ON public.cadastral_invoices
FOR EACH ROW
EXECUTE FUNCTION public.provision_service_access_on_paid();