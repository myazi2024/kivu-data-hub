## Objectif

Quand `declaredUsage === 'Location'` ET `rentalConfiguration === 'multi'` (« Divisé en plusieurs locaux »), l'occupation, la capacité, le loyer et la date de début de location doivent être saisis **par local** au lieu de la construction entière. Ajouter un sélecteur d'étage par local si la construction a ≥ 1 étage. Répercuter dans l'onglet « Valeur marchande ».

Applicable à la construction principale (`GeneralTab`) **et** aux constructions additionnelles (`AdditionalConstructionBlock`).

## 1. Modèle de données (`useCadastralContribution.tsx`)

Étendre `RentalUnit` :

```ts
interface RentalUnit {
  label?: string;
  monthlyRentUsd?: number;          // existant
  isOccupied?: boolean;             // NOUVEAU
  hostingCapacity?: number;         // NOUVEAU
  rentalStartDate?: string;         // NOUVEAU (ISO yyyy-MM-dd)
  floor?: string;                   // NOUVEAU 'RDC' | '1' | '2'…
}
```

Aucune nouvelle colonne SQL : `rental_units jsonb` existe déjà et accepte ces clés. Idem pour `additional_constructions` (déjà jsonb).

## 2. Composant `RentalConfigurationFields.tsx`

Étendre `MonthlyRentFields` (ou créer `RentalUnitsFields`) avec, dans chaque carte « Local #N » :
- `label` (déjà présent),
- `floor` : `Select` conditionnel rendu **uniquement si** `numberOfFloors >= 1`. Options générées : `RDC`, `1er étage`, `2e étage`, …, jusqu'à `numberOfFloors`. Valeur stockée normalisée (`'RDC' | '1' | '2'…`).
- `isOccupied` : boutons Oui/Non,
- `hostingCapacity` : `Input number` (rendu dès `isOccupied !== undefined`),
- `rentalStartDate` : date picker (≥ 01/01/`constructionYear`, ≤ aujourd'hui),
- `monthlyRentUsd` (déjà présent).

Signature mise à jour : ajouter props `numberOfFloors?: number` et `constructionYear?: number` pour piloter `floor` et la borne min de `rentalStartDate`.

Highlight requis si `highlightRequired` + champ manquant.

## 3. `GeneralTab.tsx` (construction principale)

- Quand `declaredUsage === 'Location'` ET `rentalConfiguration === 'multi'` :
  - **Masquer** les blocs globaux `isOccupied`, `hostingCapacity`, `rentalStartDate` (les conserver seulement en mode `single`).
  - Passer `numberOfFloors` (parseInt) et `constructionYear` à `RentalConfigurationFields`.
- Calcul auto (effet ou `useMemo` côté hook) : `hostingCapacity = Σ rentalUnits[i].hostingCapacity`. Écrit dans `formData.hostingCapacity` pour préserver les agrégats existants (admin, analytics, taxe). Champ global non éditable, non affiché.
- Quand on passe de `multi → single`, on rejette la capacité agrégée et on rebascule sur la saisie globale.

## 4. `AdditionalConstructionBlock.tsx`

Mêmes règles. Réutiliser le composant. Bloc occupation/capacité/date global masqué en mode multi. `numberOfFloors`/`constructionYear` passés depuis l'item courant.

## 5. Validation (`useFormValidation.ts`)

Pour chaque construction (main + additional) où `declaredUsage='Location'` et `rentalConfiguration='multi'` :
- Pour chaque local : `isOccupied` requis, `hostingCapacity > 0` si occupé, `rentalStartDate` requis, `monthlyRentUsd > 0` (déjà), `floor` requis si `numberOfFloors >= 1`.
- Message d'erreur précis : « Local #N : capacité manquante » etc.
- Le contrôle global `isOccupied/hostingCapacity/rentalStartDate` est **désactivé** dans ce cas (déplacé au niveau local).

## 6. Onglet « Valeur marchande » (`MarketValueTab.tsx`)

Le bloc 2 doit lister les **locaux** vacants, pas les constructions :
- Pour chaque construction en `declaredUsage='Location'`:
  - Si `rentalConfiguration='single'` et `isOccupied=false` → 1 carte (comportement actuel).
  - Si `rentalConfiguration='multi'` → itérer `rentalUnits` et générer une carte par unité où `isOccupied === false`. Afficher : libellé, étage, capacité, loyer actuel, type/nature/matériaux/standing (héritent de la construction).
- `marketListings` étendu : `{ constructionRef, unitIndex?: number, unitLabel?, floor?, listForRent, targetRentUsd?, availableFrom? }`. `unitIndex` non défini = construction entière (single).
- Si aucun local vacant éligible → message inchangé.

## 7. Persistance & migrations

- Aucune migration SQL nécessaire (jsonb existant accepte les nouvelles clés).
- `useCCCFormState.ts` : la restauration depuis BDD lit déjà `rental_units` comme tableau ; les nouvelles clés passent sans changement. Si la BDD contient un ancien enregistrement multi avec capacité/occupation globales, **migration de lecture côté hook** : si `rentalConfiguration='multi'` et locaux sans `isOccupied`, on laisse vide (l'utilisateur recomplète à l'édition).
- `DRAFT_SAFE_FIELDS` : `rentalUnits` déjà inclus → OK.

## 8. Impacts secondaires

- `ReviewTab.tsx` : section Construction → si multi, lister par local (capacité, étage, loyer, date début, occupation) au lieu des valeurs globales.
- `CCCDetailsDialog.tsx` admin : même logique d'affichage.
- `usePropertyTaxCalculator.tsx` / `BuildingTaxCalculator.tsx` / `IRLCalculator.tsx` : ces calculs consomment `hostingCapacity` global et `monthlyRentUsd` agrégé. La somme côté GeneralTab garde la compat. **À vérifier** : utiliser `Σ rentalUnits.hostingCapacity` et `Σ monthlyRentUsd` (déjà fait pour le loyer) → un helper `aggregateRental(formData)` partagé.

## 9. Vérification

- Mode single inchangé.
- Mode multi : champs globaux masqués ; saisie par local ; capacité agrégée correcte ; étage présent ↔ `numberOfFloors >= 1`.
- Soumission : payload `rental_units` contient les nouvelles clés ; relecture en édition restitue tout.
- Valeur marchande : 1 ligne par local vacant ; case à cocher + loyer cible + dispo.
- Récap & Admin reflètent la décomposition.

## Fichiers (estimés)

- **Édition** :
  - `src/components/cadastral/RentalConfigurationFields.tsx` (ajout champs floor/isOccupied/capacity/rentalStartDate par local)
  - `src/components/cadastral/ccc-tabs/GeneralTab.tsx` (masquage conditionnel global + props vers RentalConfigurationFields + agrégation)
  - `src/components/cadastral/AdditionalConstructionBlock.tsx` (idem)
  - `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` (itération par local)
  - `src/components/cadastral/ccc-tabs/ReviewTab.tsx` (affichage par local)
  - `src/components/admin/ccc/CCCDetailsDialog.tsx`
  - `src/hooks/useCadastralContribution.tsx` (types RentalUnit étendus)
  - `src/hooks/ccc/useFormValidation.ts` (règles par local)
  - `src/hooks/usePropertyTaxCalculator.tsx` (utiliser somme capacités si multi)
- **Création éventuelle** : helper `src/utils/rentalAggregation.ts` (`aggregateRental(formData)` → capacité totale, loyer total).
- **Aucune migration SQL.**
