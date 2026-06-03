-- P1-5: RLS publique exclut les services soft-deleted
DROP POLICY IF EXISTS "Services config are viewable by everyone" ON public.cadastral_services_config;
CREATE POLICY "Services config are viewable by everyone"
ON public.cadastral_services_config
FOR SELECT
USING (is_active = true AND deleted_at IS NULL);

-- P1-6: contrainte CHECK sur category
ALTER TABLE public.cadastral_services_config
  DROP CONSTRAINT IF EXISTS cadastral_services_config_category_check;
ALTER TABLE public.cadastral_services_config
  ADD CONSTRAINT cadastral_services_config_category_check
  CHECK (category IN ('consultation','fiscal','juridique'));

-- P1-7: nettoyage des politiques RLS dupliquées sur cadastral_invoices
DROP POLICY IF EXISTS "Admins view all invoices" ON public.cadastral_invoices;
DROP POLICY IF EXISTS "Users view own invoices" ON public.cadastral_invoices;