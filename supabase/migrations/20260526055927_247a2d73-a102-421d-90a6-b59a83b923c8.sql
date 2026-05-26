ALTER TABLE public.cadastral_parcels DROP CONSTRAINT IF EXISTS cadastral_parcels_declared_usage_check;

ALTER TABLE public.cadastral_parcels ADD CONSTRAINT cadastral_parcels_declared_usage_check CHECK (
  declared_usage = ANY (ARRAY[
    'Habitation'::text, 'Usage mixte'::text, 'Commerce'::text, 'Bureau'::text, 'Entrepôt'::text,
    'Industrie'::text, 'Agriculture'::text, 'Terrain vacant'::text, 'Parking'::text, 'Location'::text,
    'Résidentiel'::text, 'Commercial'::text, 'Mixte'::text, 'Institutionnel'::text, 'Industriel'::text, 'Agricole'::text
  ])
);