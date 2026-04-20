
-- Fix ERROR : RLS sur bic_invoice_seq_year (table technique)
ALTER TABLE public.bic_invoice_seq_year ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seuls les admins peuvent lire la séquence"
  ON public.bic_invoice_seq_year FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Pas de policy INSERT/UPDATE/DELETE → seules les fonctions SECURITY DEFINER y accèdent

-- Fix WARN search_path sur les fonctions créées dans la migration précédente
ALTER FUNCTION public.prevent_paid_invoice_mutation() SET search_path = public;
ALTER FUNCTION public.update_company_legal_info_timestamp() SET search_path = public;
-- generate_normalized_invoice_number a déjà search_path défini
