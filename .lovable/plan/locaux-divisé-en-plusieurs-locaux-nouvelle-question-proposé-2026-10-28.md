# Locaux (« Divisé en plusieurs locaux ») : nouvelle question « proposé à la location »

## Ce qui change pour l'utilisateur
Dans chaque fiche de local :
1. Nouvelle question **« Ce local est-il proposé à la location ? »** (Oui / Non), placée avant « Ce local est-il actuellement occupé ? ». Le mot « local » suit la catégorie (appartement, bureau…), comme les autres libellés.
2. Suppression de **« Ce local est occupé par : »** et de ses deux choix (bailleur / locataire).
3. L'occupant est déduit automatiquement :

| Proposé à la location | Occupé | Résultat |
|---|---|---|
| Oui | Oui | Occupé par un locataire : loyer, date de début et contrat de bail demandés |
| Oui | Non | Local vacant à louer : capacité d'accueil demandée, pas de loyer en cours |
| Non | Oui | Occupé par le bailleur : pas de loyer, pas de date de bail, pas de contrat |
| Non | Non | Local inoccupé, hors location : pas de loyer, pas de contrat |

Une petite note sous les réponses rappelle la déduction (ex. « Occupé par le bailleur — aucun loyer n'est demandé »).

## Cohérence partout ailleurs
- Les calculs déjà en place (revenu locatif total, analyses Données foncières, espace utilisateur, rappel de contrat de bail, onglet Valeurs) continuent de lire « occupé par bailleur / locataire » : cette valeur est désormais calculée automatiquement au lieu d'être saisie, donc rien ne change dans leurs résultats.
- Un local « Non proposé + Non occupé » ne compte ni comme loyer ni comme local vacant à louer dans l'onglet Valeurs (il n'apparaît pas dans la liste des locaux à mettre en location).
- Brouillons et contributions déjà enregistrés : la réponse « proposé à la location » est reconstituée à partir de l'ancien choix (locataire → Oui, bailleur → Non, vacant → Oui).

## Détails techniques
- `RentalUnit` (RentalConfigurationFields, useCadastralContribution) : nouveau champ `isOfferedForRent?: boolean` (JSON `is_offered_for_rent`). `occupiedBy` reste stocké mais est **dérivé** par un helper pur `deriveUnitOccupant(isOfferedForRent, isOccupied)` dans `src/utils/rentalStatus.ts`, appliqué dans `updateUnit` ; réponses dépendantes effacées quand on bascule (loyer/date/contrat si bailleur ou hors location).
- `normalizeRentalUnitFromDb` : lit `is_offered_for_rent`, sinon le reconstitue depuis `occupied_by`/`is_occupied`.
- Validation (`missingOccupiedBy` supprimé, nouveau `missingOfferedForRent`) dans le composant et `useFormValidation` ; complétude dans `useCCCFormState`.
- Récapitulatif (ReviewTab) et détail admin (CCCDetailsDialog) : afficher « Proposé à la location » et l'occupant déduit.
- Côté serveur : un trigger `BEFORE INSERT/UPDATE` sur `cadastral_contributions` recalcule `occupied_by` dans chaque local de `rental_units` (racine et constructions additionnelles) à partir de `is_offered_for_rent` + `is_occupied`, pour que les totaux serveur existants (qui filtrent `occupied_by = 'owner'`) restent justes même si le navigateur envoie une valeur forgée. Générateurs de données de test mis à jour pour remplir le nouveau champ.
- Onglet Valeurs : la liste des locaux à louer exclut `isOfferedForRent === false`.
- Tests : `deriveUnitOccupant` (4 combinaisons), reconstitution des anciens enregistrements, validation du nouveau champ.
