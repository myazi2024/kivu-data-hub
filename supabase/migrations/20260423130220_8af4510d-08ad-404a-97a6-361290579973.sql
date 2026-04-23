DELETE FROM public.user_roles 
WHERE user_id = 'e22b36e2-203b-45ce-88c2-2d4869b315a2' AND role = 'super_admin';

INSERT INTO public.user_roles (user_id, role)
VALUES ('9f6dda49-f2bb-4b09-ad58-2318491de6eb', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;