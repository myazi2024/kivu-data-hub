UPDATE public.parcel_actions_config SET description = 'Enregistrer une autorisation existante sur cette parcelle' WHERE action_key = 'permit_add' AND description ILIKE '%permis%';
UPDATE public.parcel_actions_config SET description = 'Soumettre une nouvelle demande d''autorisation' WHERE action_key = 'permit_request' AND description ILIKE '%permis%';
