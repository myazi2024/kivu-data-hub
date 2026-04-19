-- Purge des accès orphelins issus de l'ancien seed test mode (service_id désalignés du catalogue)
DELETE FROM public.cadastral_service_access
WHERE service_type IN ('carte_cadastrale', 'fiche_identification', 'certificat_bornage');