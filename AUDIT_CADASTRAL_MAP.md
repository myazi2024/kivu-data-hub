
## Litige foncier (2026-10-10)
- Pièces jointes refusées par le stockage (dossier `land-disputes/<uid>`) → `<uid>/land-disputes/`, chemins enregistrés, ouverture par lien signé.
- Signalement, vérification de référence et levée via RPC serveur : validation, anti-doublon tous utilisateurs, référence serveur, notifications déclarant + admins (avant : admins jamais notifiés).
- Levée : toute partie peut vérifier la référence (sans données personnelles) ; litige d'origine passé en « Demande de levée » côté serveur (avant : toujours refusé) ; `lifting_status` renseigné.
- Déclencheurs : décision admin sur la levée répercutée sur le litige d'origine ; indicateur `has_dispute` de la parcelle recalculé (avant : jamais mis à jour).
- Code mort supprimé (contrôle doublon/état navigateur, génération de référence `Math.random`, notifications navigateur). Ajout direct par les utilisateurs retiré.
