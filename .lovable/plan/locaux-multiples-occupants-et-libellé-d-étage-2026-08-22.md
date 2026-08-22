# Locaux multiples : occupants et libellé d'étage

## 1. Nombre d'occupants par local

Dans le bloc Construction (onglet Localisation), mode « Divisé en plusieurs locaux » :

- Dans chaque « Local # », lorsque « Ce local est-il actuellement occupé ? » = **Oui**, afficher un nouveau champ **« Combien de personnes y vivent ? »** (nombre entier, min 1), placé juste après la question d'occupation et avant « Capacité d'accueil ».
- Si l'utilisateur repasse à **Non**, la valeur saisie est purgée (comme le fait déjà le mode « un seul local »).
- Cohérence avec la capacité : le nombre d'occupants ne peut pas dépasser la capacité d'accueil du local ; message d'erreur inline le cas échéant.
- Agrégation : le total des occupants des locaux alimente le champ global `occupantCount` de la construction, comme la capacité d'accueil est déjà agrégée.
- Le récapitulatif, l'onglet Valeur marchande (locaux vacants) et la vue admin affichent cette donnée.

## 2. Libellé « Rez-de-chaussée »

Dans le picklist « Emplacement du local », remplacer l'affichage « RDC » par **« Rez-de-chaussée »**. La valeur stockée reste `RDC` pour ne pas casser les données existantes ; seuls les libellés affichés changent (formulaire, récapitulatif, annonces, admin).

## Détails techniques

- `src/components/cadastral/RentalConfigurationFields.tsx` :
  - `RentalUnit` : ajout de `occupantCount?: number`.
  - Champ conditionnel `unit.isOccupied === true`, avec purge sur bascule « Non ».
  - `floorLabel(0)` → `'Rez-de-chaussée'` (valeur inchangée `'RDC'`).
  - Export d'un helper `resolveOccupantsSum` à côté de l'agrégation de capacité existante.
- `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx` : agrégation de `occupantCount` en mode multi (même mécanisme que `hostingCapacity`).
- Affichages : `ccc-tabs/review/RentalSummary.tsx`, `ccc-tabs/MarketValueTab.tsx` (libellé étage + occupants), `src/components/admin/ccc/CCCRentalBlock.tsx`, `src/components/user/assets/RentalUnitsPanel.tsx`.
- Validation : `useFormValidation.ts` — occupants requis si local occupé, et ≤ capacité.
- Aucune migration base de données : `rental_units` est un JSONB, le nouveau champ s'y ajoute directement.
