-- Create invoice_template_config table for centralized invoice template settings
CREATE TABLE IF NOT EXISTS public.invoice_template_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_template_config ENABLE ROW LEVEL SECURITY;

-- Public read of active configs (consumed by pdf.ts on the client)
CREATE POLICY "invoice_template_config_public_read"
  ON public.invoice_template_config
  FOR SELECT
  USING (is_active = true);

-- Admin write
CREATE POLICY "invoice_template_config_admin_insert"
  ON public.invoice_template_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "invoice_template_config_admin_update"
  ON public.invoice_template_config
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "invoice_template_config_admin_delete"
  ON public.invoice_template_config
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- updated_at trigger
CREATE TRIGGER trg_invoice_template_config_updated_at
  BEFORE UPDATE ON public.invoice_template_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default values
INSERT INTO public.invoice_template_config (config_key, config_value, description) VALUES
  ('tva_rate', '0.16'::jsonb, 'Taux de TVA appliqué (décimal, 0.16 = 16%)'),
  ('tva_label', '"TVA (16%)"'::jsonb, 'Libellé affiché pour la TVA'),
  ('default_format', '"a4"'::jsonb, 'Format par défaut: a4 ou mini'),
  ('show_dgi_mention', 'true'::jsonb, 'Afficher la mention FACTURE NORMALISÉE DGI'),
  ('show_verification_qr', 'true'::jsonb, 'Afficher le QR code de vérification'),
  ('header_color', '"#dc2626"'::jsonb, 'Couleur principale en-tête (hex)'),
  ('secondary_color', '"#1f2937"'::jsonb, 'Couleur secondaire (hex)'),
  ('footer_text', '"Merci pour votre confiance. Document généré électroniquement."'::jsonb, 'Texte du pied de page'),
  ('payment_terms', '"Paiement immédiat à la commande."'::jsonb, 'Conditions de paiement'),
  ('invoice_number_prefix', '"BIC"'::jsonb, 'Préfixe du numéro de facture')
ON CONFLICT (config_key) DO NOTHING;