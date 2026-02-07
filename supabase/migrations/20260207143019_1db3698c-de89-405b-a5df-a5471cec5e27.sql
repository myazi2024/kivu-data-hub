
-- Replace mortgage_add with the unified mortgage_management
UPDATE parcel_actions_config 
SET action_key = 'mortgage_management', 
    label = 'Gestion Hypothèque', 
    description = 'Ajouter ou retirer une hypothèque',
    display_order = 3
WHERE id = '1f323add-5180-41f7-b11a-6e6ca22700f8';

-- Hide/remove the old mortgage_remove entry
DELETE FROM parcel_actions_config 
WHERE id = 'b0ec1a18-07c7-4aed-85a4-6cc3755643f6';
