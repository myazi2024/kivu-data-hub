-- Trigger automatique pour updated_at sur cadastral_services_config
CREATE OR REPLACE FUNCTION public.update_cadastral_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_cadastral_services_updated_at
  BEFORE UPDATE ON public.cadastral_services_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- Fonction pour générer un service_id unique
CREATE OR REPLACE FUNCTION public.generate_service_id(service_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_id text;
  final_id text;
  counter integer := 1;
BEGIN
  -- Générer un ID basé sur le nom (slug)
  base_id := lower(regexp_replace(service_name, '[^a-zA-Z0-9]+', '_', 'g'));
  base_id := trim(both '_' from base_id);
  final_id := base_id;
  
  -- Vérifier les doublons et ajouter un suffixe si nécessaire
  WHILE EXISTS (SELECT 1 FROM public.cadastral_services_config WHERE service_id = final_id) LOOP
    final_id := base_id || '_' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_id;
END;
$$;

-- Fonction pour vérifier si un service est utilisé
CREATE OR REPLACE FUNCTION public.check_service_usage(service_id_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_count integer;
  result jsonb;
BEGIN
  -- Compter les factures utilisant ce service
  SELECT COUNT(DISTINCT ci.id) INTO usage_count
  FROM public.cadastral_invoices ci
  WHERE ci.selected_services::jsonb ? service_id_param;
  
  result := jsonb_build_object(
    'is_used', usage_count > 0,
    'usage_count', usage_count,
    'can_delete', usage_count = 0
  );
  
  RETURN result;
END;
$$;

-- Ajouter soft delete sur cadastral_services_config
ALTER TABLE public.cadastral_services_config 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_cadastral_services_service_id 
ON public.cadastral_services_config(service_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cadastral_services_active 
ON public.cadastral_services_config(is_active) 
WHERE deleted_at IS NULL;