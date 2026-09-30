# Audit espace utilisateur — 2026-09-30

## Corrigé
| Rubrique | Problème | Gravité | Correction |
|---|---|---|---|
| Autorisations de bâtir | Terme « Permis » affiché (toast, chronologie, alerte de renouvellement) | Faible | Remplacé par « Autorisation » |
| Général | Fichiers jamais importés : UserInvoices, UserProfileHeader, PermitRequestCard, UserContributionsStats | Faible | Supprimés |

## Vérifié sans anomalie
- Aucun `Math.random`, aucun `console.log`, aucune insertion de paiement côté client dans `src/components/user`.
- Contrôle de types OK.

## Non vérifié
- Parcours navigateur avec compte connecté.
- Revue détaillée des règles d'accès serveur, rubrique par rubrique.
