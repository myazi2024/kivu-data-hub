# Revue de l'espace admin — alignement avec les évolutions récentes du front-end

## Constats vérifiés
- Toutes les entrées du menu admin (82) ouvrent bien un écran : aucun lien cassé.
- **Édition de parcelle (Carte cadastrale admin)** : le dialogue ne gère aucun des champs ajoutés récemment au formulaire CCC — circonscription foncière, type SU/SR dérivé, état de la construction, revêtement de route / caniveau, contrat de location. Un admin ne peut donc ni voir ni corriger ces données.
- **Liste des contributions CCC** : la circonscription n'apparaît que dans la fiche détail ; pas de filtre « Circonscription » alors que Données foncières l'utilise désormais.
- **Demandes de correction CCC** : le panneau admin existe et appelle `apply_ccc_correction_request`, mais l'existence de la table et de la fonction en base n'est pas confirmée (base injoignable lors des sessions précédentes).
- **Test de configuration** : un délai artificiel d'1 s simule un test au lieu d'un vrai contrôle.
- **Composant orphelin** : `InvoiceSourceLink` n'est utilisé nulle part.

## Corrections proposées
1. **Vérifier d'abord la base** : présence de `ccc_correction_requests` et de la RPC ; si absentes, les créer (table + GRANT + RLS admin/propriétaire, RPC atomique `SECURITY DEFINER` appliquant les champs du catalogue éditable) ; sinon, simple test du panneau.
2. **Dialogue d'édition de parcelle** : ajouter circonscription (picklist dépendante de la province), type SU/SR dérivé en lecture seule avec préfixe automatique, état de la construction, revêtement / caniveau / raccordement, avec les mêmes validations que le CCC (réutilisation de `geographicData.ts` et des normaliseurs existants).
3. **Contributions CCC** : filtre « Circonscription » (et colonne compacte) dans la liste, recherche côté serveur.
4. **Test de configuration** : retirer le faux délai, faire un vrai appel de lecture et afficher l'erreur réelle.
5. **Nettoyage** : brancher `InvoiceSourceLink` dans la liste des factures s'il apporte le lien vers la demande source, sinon le supprimer.
6. **Validation** : typecheck, tests Vitest, vérification visuelle des écrans modifiés ; rapport court `docs/reports/AUDIT_ADMIN_2026-09-29.md`.

## Détails techniques
- Aucun changement de logique métier hors des champs listés ; statuts en EN, SQL avec `SET search_path = public`.
- Les écrans admin authentifiés ne pourront être testés en direct que si une session admin est disponible (MFA obligatoire) ; sinon signalé comme non vérifié.
