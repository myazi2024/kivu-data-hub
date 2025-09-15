-- Création d'une table pour l'historique des données de marché
CREATE TABLE IF NOT EXISTS public.market_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  average_rent_price NUMERIC NOT NULL DEFAULT 0,
  vacancy_rate NUMERIC NOT NULL DEFAULT 0,
  transaction_volume INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (zone_id) REFERENCES public.territorial_zones(id) ON DELETE CASCADE,
  UNIQUE(zone_id, month, year)
);

-- Enable RLS
ALTER TABLE public.market_trends ENABLE ROW LEVEL SECURITY;

-- Policies pour market_trends
CREATE POLICY "Market trends are viewable by everyone" 
ON public.market_trends 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage market trends" 
ON public.market_trends 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fonction pour calculer la superficie depuis les coordonnées GPS (serveur)
CREATE OR REPLACE FUNCTION public.calculate_surface_from_coordinates(coordinates JSONB)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  coords JSONB;
  area NUMERIC := 0;
  i INTEGER;
  j INTEGER;
  n INTEGER;
  lat1 NUMERIC;
  lng1 NUMERIC;
  lat2 NUMERIC;
  lng2 NUMERIC;
BEGIN
  -- Vérifier que les coordonnées existent et sont un array
  IF coordinates IS NULL OR jsonb_typeof(coordinates) != 'array' THEN
    RETURN NULL;
  END IF;
  
  coords := coordinates;
  n := jsonb_array_length(coords);
  
  -- Il faut au moins 3 points pour calculer une superficie
  IF n < 3 THEN
    RETURN NULL;
  END IF;
  
  -- Calcul de l'aire avec la formule de Shoelace
  FOR i IN 0..(n-1) LOOP
    j := (i + 1) % n;
    
    lat1 := (coords->i->>'lat')::NUMERIC;
    lng1 := (coords->i->>'lng')::NUMERIC;
    lat2 := (coords->j->>'lat')::NUMERIC;
    lng2 := (coords->j->>'lng')::NUMERIC;
    
    area := area + (lat1 * lng2);
    area := area - (lat2 * lng1);
  END LOOP;
  
  -- Conversion approximative en m² (facteur de conversion pour les coordonnées géographiques)
  RETURN ABS(area) / 2 * 111319.5 * 111319.5;
END;
$$;

-- Fonction pour obtenir les données de tendance pour une zone
CREATE OR REPLACE FUNCTION public.get_zone_trend_data(zone_id_param UUID, months_back INTEGER DEFAULT 6)
RETURNS TABLE(
  month TEXT,
  value NUMERIC,
  period_date DATE
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - (generate_series(months_back-1, 0, -1) * INTERVAL '1 month')), 'Mon') as month,
    COALESCE(mt.average_rent_price, tz.prix_moyen_loyer) as value,
    DATE_TRUNC('month', CURRENT_DATE - (generate_series(months_back-1, 0, -1) * INTERVAL '1 month'))::DATE as period_date
  FROM generate_series(months_back-1, 0, -1) as month_offset
  LEFT JOIN public.market_trends mt ON (
    mt.zone_id = zone_id_param 
    AND mt.year = EXTRACT(year FROM CURRENT_DATE - (month_offset * INTERVAL '1 month'))
    AND mt.month = EXTRACT(month FROM CURRENT_DATE - (month_offset * INTERVAL '1 month'))
  )
  LEFT JOIN public.territorial_zones tz ON tz.id = zone_id_param
  ORDER BY period_date;
END;
$$;

-- Table pour l'audit des actions critiques
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS pour audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour audit_logs (seulement les admins peuvent voir)
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "System can create audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Fonction pour enregistrer les actions d'audit
CREATE OR REPLACE FUNCTION public.log_audit_action(
  action_param TEXT,
  table_name_param TEXT DEFAULT NULL,
  record_id_param UUID DEFAULT NULL,
  old_values_param JSONB DEFAULT NULL,
  new_values_param JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    action_param,
    table_name_param,
    record_id_param,
    old_values_param,
    new_values_param
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Trigger pour auditer les modifications sur les parcelles cadastrales
CREATE OR REPLACE FUNCTION public.audit_cadastral_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_action(
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_action(
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_action(
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Appliquer les triggers d'audit sur les tables sensibles
DROP TRIGGER IF EXISTS audit_cadastral_parcels ON public.cadastral_parcels;
CREATE TRIGGER audit_cadastral_parcels
  AFTER INSERT OR UPDATE OR DELETE ON public.cadastral_parcels
  FOR EACH ROW EXECUTE FUNCTION public.audit_cadastral_changes();

DROP TRIGGER IF EXISTS audit_cadastral_invoices ON public.cadastral_invoices;
CREATE TRIGGER audit_cadastral_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.cadastral_invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_cadastral_changes();

-- Vue sécurisée pour les données cadastrales avec calculs serveur
CREATE OR REPLACE VIEW public.cadastral_parcels_with_calculated_data AS
SELECT 
  cp.*,
  public.calculate_surface_from_coordinates(cp.gps_coordinates) as calculated_surface_sqm,
  CASE 
    WHEN cp.gps_coordinates IS NOT NULL 
    THEN public.calculate_surface_from_coordinates(cp.gps_coordinates) / 10000.0 
    ELSE cp.area_hectares 
  END as calculated_area_hectares
FROM public.cadastral_parcels cp;

-- Grant permissions sur la vue
GRANT SELECT ON public.cadastral_parcels_with_calculated_data TO authenticated;
GRANT SELECT ON public.cadastral_parcels_with_calculated_data TO anon;