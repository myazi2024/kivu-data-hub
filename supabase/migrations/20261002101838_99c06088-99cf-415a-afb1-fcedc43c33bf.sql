CREATE OR REPLACE VIEW public.cadastral_parcels_public AS
SELECT p.id, p.parcel_number, p.parcel_type, p.location, p.property_title_type,
       p.area_sqm, p.area_hectares, p.province, p.ville, p.commune, p.quartier,
       p.territoire, p.collectivite, p.groupement, p.village, p.has_dispute,
       p.is_subdivided, p.created_at, p.updated_at, p.title_reference_number,
       p.gps_coordinates, p.parcel_sides, p.road_sides, p.latitude, p.longitude,
       p.avenue,
       CASE WHEN jsonb_typeof(p.building_shapes) = 'array' THEN (
         SELECT jsonb_agg(jsonb_build_object(
           'vertices', (SELECT jsonb_agg(jsonb_build_object('lat', v.value->'lat', 'lng', v.value->'lng') ORDER BY v.ordinality)
                        FROM jsonb_array_elements(s.shape->'vertices') WITH ORDINALITY AS v(value, ordinality)),
           'sides', CASE WHEN jsonb_typeof(s.shape->'sides') = 'array' THEN (
             SELECT jsonb_agg(jsonb_build_object('length', edge.value->'length') ORDER BY edge.ordinality)
             FROM jsonb_array_elements(s.shape->'sides') WITH ORDINALITY AS edge(value, ordinality)
           ) ELSE NULL END,
           'heightM', s.shape->'heightM',
           'linkedIndex', s.shape->'linkedIndex'
         ) ORDER BY s.ordinality)
         FROM jsonb_array_elements(p.building_shapes) WITH ORDINALITY AS s(shape, ordinality)
         WHERE jsonb_typeof(s.shape->'vertices') = 'array'
           AND jsonb_array_length(s.shape->'vertices') >= 3
       ) ELSE NULL END AS building_outlines
FROM public.cadastral_parcels p
WHERE p.deleted_at IS NULL;
GRANT SELECT ON public.cadastral_parcels_public TO anon, authenticated;
GRANT ALL ON public.cadastral_parcels_public TO service_role;