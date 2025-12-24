-- Supprimer le frais d'enregistrement
UPDATE mutation_fees_config 
SET is_active = false 
WHERE fee_name = 'Frais d''enregistrement';

-- Mettre à jour le frais de dossier à 83$
UPDATE mutation_fees_config 
SET amount_usd = 83.00,
    is_mandatory = false
WHERE fee_name = 'Frais de dossier';

-- Rendre le frais de vérification non obligatoire
UPDATE mutation_fees_config 
SET is_mandatory = false 
WHERE fee_name = 'Frais de vérification';