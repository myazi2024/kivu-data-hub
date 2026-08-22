# Date de mise en location avant « Capacité d'accueil » (mode multi-locaux)

## Constat

Dans le bloc Construction (onglet Localisation), l'ordre des champs dépend du mode locatif :

- **Mode « Un seul local » (champ global)** — déjà conforme :
  - `ConstructionSection.tsx` : `RentalStartDateField` (l.334) précède le bloc « Capacité d'accueil » (l.345).
  - `AdditionalConstructionBlock.tsx` : `RentalStartDateField` (l.501) précède « Capacité d'accueil » (l.509).
  → Aucun changement.

- **Mode « Divisé en plusieurs locaux » (par local)** — non conforme :
  Dans `RentalConfigurationFields.tsx` (composant `MonthlyRentFields`, branche multi), l'ordre actuel de chaque bloc « Local # » est :
  1. Nom du local
  2. Emplacement du local (étage)
  3. Ce local est-il actuellement occupé ?
  4. Combien de personnes y vivent ? (si occupé)
  5. **Capacité d'accueil** (l.379-393)
  6. **Date « En location depuis le / Inoccupé depuis le »** (l.395-407) ← après la capacité
  7. Loyer mensuel

  La date doit venir **avant** la capacité.

## Changement

### `src/components/cadastral/RentalConfigurationFields.tsx`

Déplacer le bloc date (l.395-407, `<div className="space-y-1">` contenant le `<Input type="date">` « En location depuis le / Inoccupé depuis le ») pour qu'il s'affiche **juste après le sélecteur d'occupation** (« Ce local est-il actuellement occupé ? », l.326-356) et **avant** « Combien de personnes y vivent ? » et « Capacité d'accueil ».

Nouvel ordre dans chaque local :
1. Nom du local
2. Emplacement du local (étage)
3. Ce local est-il actuellement occupé ?
4. **En location depuis le / Inoccupé depuis le** (date) ← déplacé ici
5. Combien de personnes y vivent ? (si occupé)
6. Capacité d'accueil (si occupation définie)
7. Loyer mensuel

Justification du placement : la date dépend du statut d'occupation (libellé « Inoccupé depuis le » si vacant), donc elle suit immédiatement ce sélecteur. Elle précède ainsi la capacité et les occupants.

## Détails techniques

- Aucun changement de données, de validation, ni de schéma : `rentalStartDate` et `isOccupied` existent déjà sur `RentalUnit`.
- Le libellé dynamique `unit.isOccupied === false ? 'Inoccupé depuis le' : 'En location depuis le'` est conservé tel quel ; il reste cohérent car le sélecteur d'occupation précède toujours la date.
- Les indicateurs `missingDate` / `missingCapacity` (surlignage rouge) restent inchangés.
- Composant partagé `MonthlyRentFields` : la correction s'applique automatiquement à la construction principale et aux constructions supplémentaires.
- Aucune modification des affichages de restitution (récapitulatif, admin, espace utilisateur, PDF) : l'ordre du formulaire n'impacte pas ces vues.
