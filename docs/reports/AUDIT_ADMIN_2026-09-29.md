# Audit espace admin — 29/09/2026

## Constats
- 82 entrées du menu admin : toutes reliées à un écran.
- Demandes de modification CCC : table et fonction absentes en base → panneau admin et espace utilisateur inopérants.
- Carte cadastrale admin : l'édition GPS ciblait `cadastral_parcels.id` avec l'identifiant de la contribution → mise à jour silencieusement sans effet. Circonscription foncière non éditable.
- Contributions CCC : pas de filtre Circonscription.
- Test de configuration : délai artificiel d'1 s.
- `InvoiceSourceLink` : composant orphelin.

## Corrections
- Migration : table `ccc_correction_requests` (GRANT + RLS : propriétaire sur contributions approuvées, admin en lecture, annulation limitée), trigger anti-altération, liste blanche `ccc_correctable_columns()`, RPC `apply_ccc_correction_request` (admin uniquement, verrou, application typée sur contribution + parcelle, rejet motivé, notification).
- `AdminParcelEditDialog` : mise à jour par numéro de parcelle, erreur explicite si aucune parcelle, synchronisation de la contribution, champ Circonscription (dépend de la province) avec section SU/SR dérivée.
- `CCCFilters` / `AdminCCCContributions` : filtre Circonscription dépendant de la province, recherche incluant la circonscription.
- `ConfigTest` : délai supprimé. `InvoiceSourceLink` supprimé.

## Non vérifié
- Parcours admin authentifié (MFA) non testé en direct.
