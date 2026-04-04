INSERT INTO public.parcel_actions_config (action_key, label, description, is_active, is_visible, display_order, badge_type, requires_auth, category, icon_name)
VALUES ('land_title_request', 'Demander un titre foncier', 'Soumettre une demande de titre foncier', true, true, 4, 'none', true, 'title', 'ScrollText')
ON CONFLICT (action_key) DO NOTHING;