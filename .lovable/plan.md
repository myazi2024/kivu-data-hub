# Libellé de date adapté au statut d'occupation

## Contexte

En mode « Divisé en plusieurs locaux », chaque local possède un champ date dont le libellé est figé à **« En location depuis le »**. Quand le local est marqué **Non occupé**, ce libellé est incohérent : on devrait lire **« Inoccupé depuis le »**.

Le mode « Un seul local » présente la même incohérence (libellé « En location depuis quand ? ») et sera aligné pour cohérence.

## Changements

### 1. Formulaire — mode multi-locaux

`src/components/cadastral/RentalConfigurationFields.tsx` (ligne ~397) :

Le libellé du champ date devient dynamique selon `unit.isOccupied` :
- `true` ou `undefined` → **« En location depuis le »**
- `false` → **« Inoccupé depuis le »**

### 2. Formulaire — mode local unique

`src/components/cadastral/RentalStartDateField.tsx` :
- Ajouter une prop optionnelle `isOccupied?: boolean`.
- Libellé : « En location depuis quand ? » par défaut → **« Inoccupé depuis quand ? »** si `isOccupied === false`.

`src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx` (ligne ~314) :
- Passer `isOccupied={formData.isOccupied}` au `RentalStartDateField`.

### 3. Affichages de restitution (cohérence du libellé)

Adapter le libellé date selon `isOccupied === false` :

- `src/components/cadastral/ccc-tabs/review/RentalSummary.tsx` (ligne 77, par local) : « En location depuis » → « Inoccupé depuis » si vacant. Ligne 52 (mono-local) : idem selon `isOccupied`.
- `src/components/admin/ccc/CCCRentalBlock.tsx` (ligne 87) : « Depuis le » → « Inoccupé depuis le » si vacant.
- `src/components/user/assets/RentalUnitsPanel.tsx` (ligne 134) : « Depuis » → « Inoccupé depuis » si vacant.
- `src/components/cadastral/cadastral-document/sections/ConstructionSection.tsx` (ligne 33) : « En location depuis » → « Inoccupé depuis » si vacant (PDF).

## Détails techniques

- Aucune migration : `rentalStartDate` et `isOccupied` existent déjà (JSONB `rental_units` + colonne `rental_start_date`).
- Aucun changement de validation : la date reste obligatoire quel que soit le statut d'occupation.
- Helper local `dateLabel(isOccupied)` dans `RentalConfigurationFields.tsx` exporté pour réutilisation si besoin.
