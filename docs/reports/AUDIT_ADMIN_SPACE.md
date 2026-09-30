# Audit espace admin — 2026-09-30

## Corrigé
| Module | Problème | Gravité | Correction |
|---|---|---|---|
| Hypothèques | Approbation par modification directe, sans contrôle du statut : une demande déjà traitée pouvait être ré-approuvée | Haute | Passe par la fonction serveur `approve_ccc_contribution` (rôle admin + statut) |
| Hypothèques | Rejet possible d'une demande déjà traitée | Moyenne | Rejet limité aux demandes en attente, renvoyées ou en examen |
| CCC | Renvoi possible d'une contribution déjà approuvée ou rejetée ; trace de débogage | Moyenne | Renvoi limité aux contributions en attente ou en examen ; trace retirée |
| CCC, documents, configuration des contributions | Terme « Permis » affiché | Faible | « Autorisation(s) » |
| Général | Fichiers jamais utilisés : RequestAuditTimeline, UserSearchSelect | Faible | Supprimés |

## Vérifié sans anomalie
- Aucune règle d'accès en écriture ouverte à tous, sauf le formulaire de contact partenaires (voulu).
- Aucun `Math.random` dans l'admin.
- Contrôle de types OK, 185 tests OK.

## Ouvert / non vérifié
- `AdminSubdivisionZoningRules.tsx` (1 400 lignes) reste à découper.
- Recours (appels) et retrait de contribution sur la carte admin modifient encore directement la table ; à migrer vers des fonctions serveur.
- Aucun module ouvert dans le navigateur avec un compte admin.
- 101 alertes de sécurité générales de la base, non traitées.

## Passe 2
- Recours CCC : acceptation/rejet via `process_ccc_appeal` (admin, recours en attente, réponse obligatoire, notification serveur). Résolu.
- Retrait depuis la carte admin : via `withdraw_ccc_contribution` (admin, pas de double retrait). Résolu.
- Test navigateur avec compte admin impossible : base gérée par vous, aucune session ne peut être créée depuis l'outil.

## Passe 3
- Règles de zonage : écran découpé (1 400 → 837 lignes) en `subdivision/zoning/` (zoningForm, FieldHelp, GeoCascades, InfrastructureSection). Aucun changement fonctionnel.
- Réconciliation des paiements : une transaction déjà « completed » ne peut plus être réconciliée une seconde fois (garde sur le statut + message).
- Commissions revendeurs : seules les commissions non payées peuvent être marquées payées (pas de réécriture de la date de paiement).
- Rôles : aucune écriture de paiement/facture côté client ; `super_admin` protégé côté serveur. Point ouvert : un admin peut attribuer ou retirer le rôle `admin` à un autre admin (voulu par l'interface actuelle) — à restreindre au super admin si souhaité.
- Configuration / historiques : aucun `Math.random`, aucun « Permis », aucune écriture directe sensible trouvée.
