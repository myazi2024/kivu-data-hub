-- Créer une politique RLS pour permettre la lecture des statistiques de factures
CREATE POLICY "Allow statistics access for cadastral invoices" 
ON public.cadastral_invoices 
FOR SELECT 
USING (status = 'paid');