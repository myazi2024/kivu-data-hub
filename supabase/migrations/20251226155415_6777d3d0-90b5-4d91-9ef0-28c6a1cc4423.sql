-- Add 'mortgage_officer' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mortgage_officer';

-- Insert default permissions for mortgage officer role
INSERT INTO public.permissions (resource_name, action_name, display_name, description)
VALUES 
  ('mortgage_cancellation', 'view', 'Voir les demandes de radiation', 'Permet de consulter les demandes de radiation d''hypothèque'),
  ('mortgage_cancellation', 'process', 'Traiter les demandes de radiation', 'Permet de traiter et valider les demandes de radiation d''hypothèque'),
  ('mortgage_cancellation', 'generate_certificate', 'Générer les certificats de radiation', 'Permet de générer les certificats de radiation d''hypothèque')
ON CONFLICT (resource_name, action_name) DO NOTHING;

-- Add role permissions for mortgage_officer (will be associated after role creation)
-- These permissions will be added to the mortgage_officer role when a user is assigned that role