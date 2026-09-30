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

## Passe 2
| Rubrique | Problème | Gravité | Correction |
|---|---|---|---|
| Expertises, préférences, autorisations, hypothèques, litiges, titres fonciers | Liste rechargée à chaque rafraîchissement de session (dépendance à l'objet utilisateur) | Moyenne (performance) | Dépendance sur l'identifiant utilisateur |
| Serveur | Toutes les lectures des rubriques sont filtrées sur l'utilisateur ; règles d'accès des demandes limitées à `auth.uid()` | — | Vérifié |

## Ouvert (hors espace utilisateur)
- `payment_transactions` : la règle d'accès permet encore l'enregistrement d'un paiement depuis le navigateur, utilisé par `useCadastralPayment` et `BuildingPermitRequestDialog`. Le retirer demande de déplacer ces deux parcours de paiement côté serveur.

## Passe 3 — paiements
- Point ouvert résolu : les paiements test (cadastre, autorisation de bâtir) passent par la fonction serveur `record-test-payment` (utilisateur vérifié, mode test vérifié côté serveur, facture appartenant à l'utilisateur). Règle d'insertion navigateur sur `payment_transactions` supprimée.
