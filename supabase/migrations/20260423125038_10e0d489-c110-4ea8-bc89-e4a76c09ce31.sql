INSERT INTO public.user_roles (user_id, role)
VALUES ('e22b36e2-203b-45ce-88c2-2d4869b315a2', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;