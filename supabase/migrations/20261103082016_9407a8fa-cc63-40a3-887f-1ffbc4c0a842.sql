CREATE OR REPLACE FUNCTION public._parcel_security_criteria(_parcel_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; built boolean; y int := extract(year from now())::int; c jsonb := '[]'::jsonb;
  paid text[] := array['paid','completed','approved','payé'];
BEGIN
  SELECT * INTO p FROM cadastral_parcels WHERE id = _parcel_id;
  IF NOT FOUND THEN RETURN c; END IF;
  built := coalesce(p.construction_type,'') <> '' AND p.construction_type NOT ILIKE '%terrain nu%';
  c := jsonb_build_array(
    jsonb_build_object('key','title_info','theme','Droits','label','Titre de propriété renseigné (type et numéro)','weight',20,'applicable',true,
      'done', coalesce(p.property_title_type,'')<>'' AND coalesce(p.title_reference_number,'')<>''),
    jsonb_build_object('key','title_doc','theme','Droits','label','Copie du titre téléversée','weight',10,'applicable',true,
      'done', coalesce(p.property_title_document_url,'')<>''),
    jsonb_build_object('key','no_dispute','theme','Droits','label','Aucun litige foncier en cours','weight',10,'applicable',true,
      'done', NOT EXISTS (SELECT 1 FROM cadastral_land_disputes d WHERE (d.parcel_id=p.id OR d.parcel_number=p.parcel_number)
        AND coalesce(d.current_status,'') NOT IN ('resolved','closed','rejected','cancelled','lifted'))),
    jsonb_build_object('key','no_mortgage','theme','Droits','label','Aucune hypothèque active','weight',5,'applicable',true,
      'done', NOT EXISTS (SELECT 1 FROM cadastral_mortgages m WHERE m.parcel_id=p.id AND public._mortgage_is_active(m.mortgage_status, m.lifecycle_state::text))),
    jsonb_build_object('key','ownership_history','theme','Historique','label','Historique des propriétaires avec actes','weight',10,'applicable',true,
      'done', EXISTS (SELECT 1 FROM cadastral_ownership_history h WHERE h.parcel_id=p.id AND coalesce(h.ownership_document_url,'')<>'')),
    jsonb_build_object('key','boundaries','theme','Géométrie','label','Coordonnées ou croquis des limites','weight',10,'applicable',true,
      'done', (p.gps_coordinates IS NOT NULL AND p.gps_coordinates::text NOT IN ('null','[]','{}')) OR (p.parcel_sides IS NOT NULL AND p.parcel_sides::text NOT IN ('null','[]','{}'))),
    jsonb_build_object('key','area','theme','Géométrie','label','Superficie déclarée','weight',5,'applicable',true,
      'done', coalesce(p.area_sqm,0) > 0),
    jsonb_build_object('key','permit','theme','Construction','label','Autorisation de bâtir','weight',10,'applicable',built,
      'done', EXISTS (SELECT 1 FROM cadastral_building_permits b WHERE b.parcel_id=p.id)),
    jsonb_build_object('key','tax_current','theme','Fiscalité','label','Impôt foncier de l''année déclaré et payé','weight',10,'applicable',true,
      'done', EXISTS (SELECT 1 FROM cadastral_tax_history t WHERE t.parcel_id=p.id AND t.tax_year >= y-1 AND lower(coalesce(t.payment_status,'')) = ANY(paid))),
    jsonb_build_object('key','no_arrears','theme','Fiscalité','label','Aucun arriéré fiscal','weight',5,'applicable',true,
      'done', NOT EXISTS (SELECT 1 FROM cadastral_tax_history t WHERE t.parcel_id=p.id AND lower(coalesce(t.payment_status,'')) <> ALL(paid))),
    jsonb_build_object('key','expertise','theme','Expertise','label','Expertise immobilière valide','weight',5,'applicable',true,
      'done', EXISTS (SELECT 1 FROM real_estate_expertise_requests e WHERE (e.parcel_id=p.id OR e.parcel_number=p.parcel_number)
        AND e.status='completed' AND (e.certificate_expiry_date IS NULL OR e.certificate_expiry_date >= now()::date)))
  );
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public._parcel_security_criteria(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._parcel_security_score(_criteria jsonb)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN coalesce(sum((x->>'weight')::int) FILTER (WHERE (x->>'applicable')::boolean),0)=0 THEN 0
    ELSE round(100.0 * coalesce(sum((x->>'weight')::int) FILTER (WHERE (x->>'applicable')::boolean AND (x->>'done')::boolean),0)
      / sum((x->>'weight')::int) FILTER (WHERE (x->>'applicable')::boolean))::int END
  FROM jsonb_array_elements(_criteria) x
$$;

CREATE OR REPLACE FUNCTION public.get_my_parcel_security_report(_parcel_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM cadastral_parcels WHERE id=_parcel_id AND owner_user_id=auth.uid() AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501';
  END IF;
  c := public._parcel_security_criteria(_parcel_id);
  RETURN jsonb_build_object('score', public._parcel_security_score(c), 'criteria', c);
END $$;
REVOKE ALL ON FUNCTION public.get_my_parcel_security_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_parcel_security_report(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_owned_parcels();
CREATE FUNCTION public.get_my_owned_parcels()
 RETURNS TABLE(id uuid, parcel_number text, province text, ville text, commune text, quartier text, area_sqm numeric, owner_linked_at timestamptz, contribution_id uuid, security_score int)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT p.id, p.parcel_number, p.province, p.ville, p.commune, p.quartier, p.area_sqm::numeric, p.owner_linked_at,
    (SELECT c.id FROM public.cadastral_contributions c
      WHERE c.parcel_number = p.parcel_number AND c.user_id = auth.uid() AND c.status = 'approved'
      ORDER BY c.created_at DESC LIMIT 1),
    public._parcel_security_score(public._parcel_security_criteria(p.id))
  FROM public.cadastral_parcels p
  WHERE auth.uid() IS NOT NULL AND p.owner_user_id = auth.uid() AND p.deleted_at IS NULL
  ORDER BY p.owner_linked_at DESC NULLS LAST;
$function$;
REVOKE ALL ON FUNCTION public.get_my_owned_parcels() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_owned_parcels() TO authenticated;