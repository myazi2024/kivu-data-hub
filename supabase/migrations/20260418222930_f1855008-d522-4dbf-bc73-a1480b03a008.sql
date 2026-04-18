-- Add operational permissions for PII export and notes deletion
INSERT INTO public.permissions (resource_name, action_name, display_name, description)
VALUES
  ('users', 'export_pii', 'Exporter données personnelles utilisateurs', 'Permet l''export CSV contenant des données personnelles (PII) audité'),
  ('notes', 'delete', 'Supprimer notes administratives', 'Permet la suppression définitive de notes admin sur les utilisateurs')
ON CONFLICT (resource_name, action_name) DO NOTHING;

-- Grant to super_admin and admin
INSERT INTO public.role_permissions (role, permission_id, created_by)
SELECT 'super_admin'::app_role, id, NULL
FROM public.permissions
WHERE (resource_name, action_name) IN (('users','export_pii'), ('notes','delete'))
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, created_by)
SELECT 'admin'::app_role, id, NULL
FROM public.permissions
WHERE (resource_name, action_name) IN (('users','export_pii'), ('notes','delete'))
ON CONFLICT DO NOTHING;