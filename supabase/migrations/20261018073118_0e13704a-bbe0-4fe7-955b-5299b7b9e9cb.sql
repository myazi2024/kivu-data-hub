ALTER TABLE public.partner_inquiries
  ADD COLUMN IF NOT EXISTS organization_type text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS contact_role text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Direct browser inserts for signed-in users go through the RPC; anonymous contact form keeps working.
DROP POLICY IF EXISTS "Anyone can create partner inquiries" ON public.partner_inquiries;
CREATE POLICY "Anonymous can create partner inquiries" ON public.partner_inquiries
FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Users can create basic partner inquiries" ON public.partner_inquiries
FOR INSERT TO authenticated WITH CHECK (documents = '[]'::jsonb);

CREATE OR REPLACE FUNCTION public.partner_inquiry_guard_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cette demande a été annulée par le demandeur.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_partner_inquiry_guard ON public.partner_inquiries;
CREATE TRIGGER trg_partner_inquiry_guard BEFORE UPDATE ON public.partner_inquiries
FOR EACH ROW EXECUTE FUNCTION public.partner_inquiry_guard_update();

CREATE OR REPLACE FUNCTION public.partner_inquiry_notify_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  v_label := CASE NEW.status
    WHEN 'in_review' THEN 'est en cours d''examen'
    WHEN 'approved' THEN 'a été acceptée'
    WHEN 'completed' THEN 'a été acceptée'
    WHEN 'rejected' THEN 'n''a pas été retenue'
    ELSE 'a été mise à jour' END;
  PERFORM public._notify(NEW.user_id, 'Demande de partenariat',
    'Votre demande de partenariat ' || v_label || '.', 'info',
    '/mon-compte?tab=partnership', 'partner_inquiry:' || NEW.id || ':' || NEW.status);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.partner_inquiry_notify_status() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_partner_inquiry(
  p_organization text, p_organization_type text, p_registration_number text,
  p_address text, p_city text, p_website text, p_contact_name text, p_contact_role text,
  p_phone text, p_message text, p_documents jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_id uuid; d jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
  IF public.has_role(v_uid, 'partner') THEN RAISE EXCEPTION 'Vous êtes déjà partenaire.'; END IF;
  IF EXISTS (SELECT 1 FROM partner_inquiries WHERE user_id = v_uid AND status IN ('pending','new','in_review')) THEN
    RAISE EXCEPTION 'Une demande est déjà en cours.'; END IF;
  IF length(trim(coalesce(p_organization,''))) < 2 OR length(p_organization) > 200 THEN RAISE EXCEPTION 'Nom de l''organisation invalide.'; END IF;
  IF p_organization_type NOT IN ('company','bank','notary','public_admin','ngo','other') THEN RAISE EXCEPTION 'Type d''organisation invalide.'; END IF;
  IF length(trim(coalesce(p_contact_name,''))) < 2 OR length(p_contact_name) > 200 THEN RAISE EXCEPTION 'Nom du contact invalide.'; END IF;
  IF length(trim(coalesce(p_message,''))) < 10 OR length(p_message) > 5000 THEN RAISE EXCEPTION 'Message invalide (10 à 5000 caractères).'; END IF;
  IF length(coalesce(p_registration_number,'')) > 100 OR length(coalesce(p_address,'')) > 300
     OR length(coalesce(p_city,'')) > 100 OR length(coalesce(p_contact_role,'')) > 100
     OR length(coalesce(p_website,'')) > 300 THEN RAISE EXCEPTION 'Champ trop long.'; END IF;
  IF nullif(trim(p_phone),'') IS NOT NULL AND p_phone !~ '^\+?[0-9 ]{8,20}$' THEN RAISE EXCEPTION 'Téléphone invalide.'; END IF;
  IF nullif(trim(p_website),'') IS NOT NULL AND p_website !~* '^https://[^ ]+\.[^ ]+$' THEN RAISE EXCEPTION 'Site web invalide (https:// requis).'; END IF;
  IF jsonb_typeof(coalesce(p_documents,'[]')) <> 'array' OR jsonb_array_length(coalesce(p_documents,'[]')) > 5 THEN
    RAISE EXCEPTION 'Maximum 5 documents.'; END IF;
  FOR d IN SELECT * FROM jsonb_array_elements(coalesce(p_documents,'[]')) LOOP
    IF (d->>'path') IS NULL OR split_part(d->>'path','/',1) <> v_uid::text OR length(coalesce(d->>'name','')) > 255 THEN
      RAISE EXCEPTION 'Document invalide.'; END IF;
  END LOOP;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO partner_inquiries(name, email, organization, organization_type, registration_number, address, city,
    website, contact_role, phone, message, documents)
  VALUES (trim(p_contact_name), coalesce(v_email,''), trim(p_organization), p_organization_type,
    nullif(trim(p_registration_number),''), nullif(trim(p_address),''), nullif(trim(p_city),''),
    nullif(trim(p_website),''), nullif(trim(p_contact_role),''), nullif(trim(p_phone),''), trim(p_message),
    coalesce(p_documents,'[]'))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_partner_inquiry(text,text,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_partner_inquiry(text,text,text,text,text,text,text,text,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_partner_inquiry(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; a record;
BEGIN
  SELECT * INTO r FROM partner_inquiries WHERE id = p_id FOR UPDATE;
  IF r.id IS NULL OR r.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Demande introuvable.'; END IF;
  IF r.status NOT IN ('pending','new','in_review') THEN RAISE EXCEPTION 'Cette demande ne peut plus être annulée.'; END IF;
  UPDATE partner_inquiries SET status = 'cancelled', cancelled_at = now() WHERE id = p_id;
  FOR a IN SELECT DISTINCT user_id FROM user_roles WHERE role IN ('admin','super_admin') LOOP
    PERFORM public._notify(a.user_id, 'Demande de partenariat annulée',
      coalesce(r.organization, r.name) || ' a annulé sa demande de partenariat.', 'info',
      '/admin', 'partner_inquiry:' || p_id || ':cancelled');
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.cancel_partner_inquiry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_partner_inquiry(uuid) TO authenticated;

CREATE POLICY "Partner docs owner upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Partner docs owner read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'partner-documents' AND ((storage.foldername(name))[1] = auth.uid()::text
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
CREATE POLICY "Partner docs owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = auth.uid()::text);