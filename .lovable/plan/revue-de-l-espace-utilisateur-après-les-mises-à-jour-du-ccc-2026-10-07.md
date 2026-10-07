# Revue de l'espace utilisateur après les mises à jour du CCC

## Objectif
Vérifier chaque rubrique de l'espace utilisateur (écran et serveur), corriger bugs, incohérences avec le CCC actuel, fonctions orphelines et code mort, puis tester. Aucune nouvelle fonctionnalité.

## Constat déjà vérifié
- Rubrique « Locations » : le total des loyers compte encore le loyer des locaux inoccupés, et un bien dont tous les locaux sont occupés par le propriétaire ou vacants est signalé « loyer manquant ». Le formulaire CCC et le serveur ne font plus ainsi depuis les dernières corrections.

## Étapes
1. **Alignement avec le CCC** : Locations (loyers des locaux vacants et du propriétaire, libellé « Occupé par le locataire actuel depuis le »), Annonces et Valeur (plus de disponibilité ni de prix négociable), « Modifier mes données » (liste des champs modifiables à jour : mur mitoyen, question route, contrat de location ; champs supprimés retirés), détails d'une contribution.
2. **Gestion des contributions** : compteurs, filtres, retrait, recours, suivi des demandes de modification, uniquement via les fonctions serveur existantes.
3. **Alertes et notifications** : chaque notification mène à la bonne rubrique (anciennes adresses corrigées), compteurs non lus justes, panne de chargement visible, alertes « à faire » de la vue d'ensemble (contribution rejetée, autorisation à renouveler, facture impayée) reliées à leur action.
4. **Démarches, factures, données** : chargements, états vides, erreurs affichées, boutons sans effet.
5. **Nettoyage** : fichiers, fonctions et imports jamais utilisés (confirmés par recherche avant suppression), requêtes en double regroupées.
6. **Serveur** : chaque lecture limitée à l'utilisateur connecté ; correction par nouvelle migration seulement si nécessaire.
7. **Tests** : tests automatiques ajoutés pour chaque bug corrigé, contrôle du code, suite complète. Parcours à l'écran limité aux pages publiques, l'espace utilisateur demandant une connexion qui ne peut pas être simulée ici.

## Livrable
Rapport mis à jour (`docs/reports/AUDIT_USER_SPACE.md`, passe 4) : problème, gravité, correction.

## Détails techniques
- `src/utils/userRentalMarket.ts` : utiliser `isRentExemptUnit` de `rentalStatus.ts` pour le total et `missingRent` (ignorer quand aucun local n'est loué à un tiers).
- Périmètre : `src/pages/UserDashboard.tsx`, `src/components/user/**`, `src/lib/ccc/editableFieldsCatalog.ts`, `useUserContributions`, `useNotifications`, `useUserDashboardStats`, `userDashboardLinks.ts`.
- Respect des règles projet : statuts EN, « Autorisation », RPC pour actions CCC, aucune insertion de paiement côté navigateur.
