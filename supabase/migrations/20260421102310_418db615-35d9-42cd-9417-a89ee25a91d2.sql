ALTER TABLE public.cadastral_credit_note_seq_year ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read credit note seq"
  ON public.cadastral_credit_note_seq_year FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));