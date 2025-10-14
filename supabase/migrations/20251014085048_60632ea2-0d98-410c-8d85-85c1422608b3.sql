-- Activer l'audit automatique sur cadastral_services_config
CREATE TRIGGER audit_cadastral_services_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.cadastral_services_config
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_audit_trigger();

-- Fonction pour obtenir l'historique des modifications d'un service
CREATE OR REPLACE FUNCTION public.get_service_audit_history(service_id_param uuid)
RETURNS TABLE(
  action text,
  changed_at timestamp with time zone,
  changed_by uuid,
  old_values jsonb,
  new_values jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    action,
    created_at as changed_at,
    user_id as changed_by,
    old_values,
    new_values
  FROM public.audit_logs
  WHERE table_name = 'cadastral_services_config'
    AND record_id = service_id_param
  ORDER BY created_at DESC
  LIMIT 50;
$$;