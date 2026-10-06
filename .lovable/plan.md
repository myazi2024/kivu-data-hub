# Loyer des locaux vacants et correctif « Limite de la parcelle »

## 1. Locaux vacants : plus de loyer dans l'onglet Localisation
Mode « Divisé en plusieurs locaux » :
- « Ce local est-il actuellement occupé ? » = **Non** : « Loyer mensuel (USD) » est masqué, vidé et n'est plus exigé (le loyer demandé se saisit dans Valeur > « Mise sur le marché des locaux vacants »).
- Le loyer reste demandé seulement pour un local occupé par un locataire (et avant que la question d'occupation soit répondue, il n'est plus signalé comme manquant).
- Le propriétaire (bailleur) reste sans loyer, comme aujourd'hui.
- Le badge « … USD/mois » de l'en-tête du local et le total des loyers ignorent les locaux vacants.
- Terrain nu (sans question d'occupation) : inchangé.

Alignement :
- Bouton Suivant, contrôles admin et récapitulatif : un local vacant sans loyer est valide.
- Onglet Valeur : la liste des locaux vacants ne reprend plus de loyer « actuel » de l'onglet Localisation ; seul le loyer saisi dans Valeur compte.
- Serveur : la vérification de cohérence n'exige plus de loyer pour un local vacant et le signale s'il en porte un ; le total locatif n'inclut que les locaux loués à un locataire. Anciennes données sans réponse d'occupation traitées comme aujourd'hui.

## 2. Bug « Limite de la parcelle » (Limites et Entrées)
Cause confirmée dans le code : en choisissant « Limite (sans mur) », le côté est marqué « sans mur », et la fonction qui relit le choix ne renvoie alors plus rien. La liste revient vide, et le bouton « Ajouter » reste grisé (il croit qu'aucune limite n'est choisie).
Correctif : le choix enregistré (Mur, Mur mitoyen, Limite) est toujours relu en priorité ; l'ancienne déduction ne sert plus qu'aux vieilles fiches. La sélection reste affichée, la question route apparaît et « Ajouter » valide le côté. Vérifier aussi que cliquer dans la liste déroulante ne referme ni ne réinitialise le côté.

## Vérification
Tests ajoutés : relecture du choix « Limite », validation d'un côté Limite + route Non, local vacant sans loyer valide, local locataire sans loyer bloquant. Typecheck, build, suite complète.

## Détails techniques
- `ParcelSidesDimensionsPanel.tsx` : `sideBoundaryKind` retourne `s.boundaryKind` avant le test `sideHasWall` ; contrôler la propagation des clics depuis le portail du Select vers la ligne cliquable (`stopPropagation` si besoin).
- `RentalConfigurationFields.tsx` : champ loyer affiché si `isTerrainNu || (isOccupied === true && occupiedBy === 'tenant')` ; « Non » vide aussi `monthlyRentUsd`, `rentalStartDate` ; `missingRent` et total alignés. Helper partagé `unitRequiresRent` dans `src/utils/rentalStatus.ts`.
- `src/hooks/ccc/useFormValidation.ts` (locaux multi), `admin/ccc/cccValidationRules.ts`, `RentalSummary.tsx`, `marketValueUtils.ts` (`currentRentUsd` non repris pour les locaux vacants).
- Nouvelle migration : `validate_contribution_completeness` exclut les locaux `is_occupied = false` de l'exigence de loyer et du total, avec avertissement si un loyer y figure.
