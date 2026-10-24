# Regrouper « Revendiquer une parcelle » dans « Mes parcelles » et retirer « Déconnecter » du menu

## 1. Espace utilisateur — « Mes parcelles »
- L'onglet « Mes parcelles » contient deux sous-onglets :
  - **Mes parcelles** : la liste actuelle des parcelles validées.
  - **Revendiquer une parcelle** : tout le parcours actuel de revendication (recherche, formulaire adaptatif, suivi, annulation).
- Le bouton « Revendiquer une parcelle » de la liste ouvre directement ce sous-onglet, sans quitter « Mes parcelles ».
- L'entrée « Revendiquer une parcelle » est retirée du menu latéral de l'espace utilisateur.
- Les anciens liens vers la revendication arrivent sur « Mes parcelles », sous-onglet Revendiquer.
- Le message affiché dans « Mes contributions » renvoie vers « Mes parcelles › Revendiquer une parcelle ».

## 2. Barre de menu de l'accueil
- Le bouton « Déconnecter » est retiré de la barre de menu, sur ordinateur et sur mobile. La déconnexion reste disponible dans l'espace utilisateur.

## Détails techniques
- `UserOwnedParcels.tsx` : ajout de `Tabs` (`list` | `claim`) synchronisés avec `?sub=claim` ; le sous-onglet `claim` affiche `UserOwnershipClaims`.
- `userDashboardConfig.ts` : suppression de l'entrée `ownership-claims`. `UserDashboard.tsx` : `ownership-claims` redirigé vers `my-parcels&sub=claim`.
- `UserContributions.tsx` : texte du toast mis à jour.
- `src/components/ui/navigation.tsx` : suppression des deux boutons appelant `signOut` (lignes ~195 et ~322) et des imports inutilisés.
