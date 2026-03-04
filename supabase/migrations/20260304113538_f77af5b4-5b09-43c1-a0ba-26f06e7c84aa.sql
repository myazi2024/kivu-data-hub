
-- Certificate templates table
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  header_title TEXT NOT NULL DEFAULT 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
  header_subtitle TEXT NOT NULL DEFAULT 'Service Agréé',
  header_organization TEXT NOT NULL DEFAULT 'BUREAU D''INFORMATION CADASTRALE (BIC)',
  body_text TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  legal_text TEXT NOT NULL DEFAULT '',
  signature_name TEXT NOT NULL DEFAULT '',
  signature_title TEXT NOT NULL DEFAULT 'Le Responsable',
  logo_url TEXT,
  signature_image_url TEXT,
  stamp_text TEXT NOT NULL DEFAULT 'CERTIFIÉ\nCONFORME',
  primary_color TEXT NOT NULL DEFAULT '#006432',
  secondary_color TEXT NOT NULL DEFAULT '#004020',
  show_qr_code BOOLEAN NOT NULL DEFAULT true,
  show_border BOOLEAN NOT NULL DEFAULT true,
  show_stamp BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(certificate_type)
);

-- Generated certificates log
CREATE TABLE public.generated_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_type TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  parcel_number TEXT NOT NULL,
  certificate_url TEXT,
  status TEXT NOT NULL DEFAULT 'generated',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  request_id UUID,
  metadata JSONB DEFAULT '{}'
);

-- RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage certificate templates"
  ON public.certificate_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin')));

CREATE POLICY "Certificate templates viewable by admins"
  ON public.certificate_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage generated certificates"
  ON public.generated_certificates FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin')));

CREATE POLICY "Users can view their own certificates"
  ON public.generated_certificates FOR SELECT
  USING (true);
