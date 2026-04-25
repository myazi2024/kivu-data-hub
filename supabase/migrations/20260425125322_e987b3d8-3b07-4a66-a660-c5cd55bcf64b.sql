CREATE TABLE public.subdivision_required_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  help_text TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  requester_types TEXT[] NOT NULL DEFAULT '{}',
  accepted_mime_types TEXT[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp','application/pdf'],
  max_size_mb INTEGER NOT NULL DEFAULT 5,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subdiv_req_docs_active_order
  ON public.subdivision_required_documents (is_active, display_order);

ALTER TABLE public.subdivision_required_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active required documents"
ON public.subdivision_required_documents
FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert required documents"
ON public.subdivision_required_documents
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update required documents"
ON public.subdivision_required_documents
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete required documents"
ON public.subdivision_required_documents
FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_subdivision_required_documents_updated_at
BEFORE UPDATE ON public.subdivision_required_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subdivision_required_documents
  (doc_key, label, help_text, is_required, display_order)
VALUES
  ('requester_id_document', 'Pièce d''identité du demandeur',
    'Carte d''électeur, passeport ou permis de conduire (recto/verso si nécessaire).', true, 10),
  ('proof_of_ownership', 'Preuve de propriété',
    'Certificat d''enregistrement, contrat de location, ou autre titre foncier valide.', true, 20),
  ('subdivision_sketch', 'Croquis annexe (optionnel)',
    'Schéma manuscrit ou plan annexe complémentaire.', false, 30)
ON CONFLICT (doc_key) DO NOTHING;