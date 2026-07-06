# Correctifs demandés

## 1. Erreurs de build (préalable)

Les 2 fichiers de tests importent `waitFor` depuis `@testing-library/react`, qui ne l'exporte plus dans la version installée. Le remplacer par `@testing-library/dom` (déjà transitivement dispo) :

- `src/components/cadastral/subdivision/hooks/__tests__/useParentParcelEligibility.test.tsx` : séparer l'import — `renderHook` reste depuis `@testing-library/react`, `waitFor` depuis `@testing-library/dom`.
- `src/hooks/__tests__/useCadastralCart.purge.test.tsx` : même correction (`render`, `act` restent, `waitFor` depuis `@testing-library/dom`).

Aucune logique de test modifiée.

## 2. Déplacement du bloc "Construction" (Infos → Localisation)

### Objectif
Rendre l'onglet **Infos** dédié uniquement au bloc "Informations sur le propriétaire". Le bloc **Construction** (avec toutes ses dépendances : constructions multiples, permis de construire, uploads, etc.) rejoint l'onglet **Localisation**, positionné **entre le premier bloc (Localisation administrative / Province + Section urbaine/rurale)** et le bloc **Localisation sur la carte** (`ParcelMapPreview`).

### Ordre final de l'onglet Localisation
```
1. Localisation administrative (province, section urbaine/rurale, ville/commune/quartier ou territoire/collectivité)
2. Construction (déplacé)  ← NOUVEAU
3. Localisation sur la carte (ParcelMapPreview)
4. Environnement sonore
5. Mesures appartement (si applicable)
6. Navigation
```

### Fichiers touchés

**`src/components/cadastral/ccc-tabs/GeneralTab.tsx`**
- Retirer le rendu `<ConstructionSection ... />` (lignes 359-388).
- Retirer les props construction/permis du composant `GeneralTab` (interface + destructuration) : `PROPERTY_CATEGORY_OPTIONS`, `availableConstructionTypes/Natures/Materials`, `availableDeclaredUsages`, `availableStandings`, `constructionMode/setConstructionMode`, `additionalConstructions/setAdditionalConstructions`, `removeAdditionalConstruction`, `permitMode/setPermitMode`, `buildingPermits`, `updateBuildingPermit`, `updateBuildingPermitFile`, `removeBuildingPermitFile`, `getPermitTypeRestrictions`, `showPermitWarning`, `highlightIncompletePermit`, `highlightRequiredFields/setHighlightRequiredFields`, `getPicklistDependentOptions`, `toast`, `resetConstructionBlock`.
- Extraire le composant `ConstructionSection` (défini plus bas dans le fichier, lignes ~407+) dans un nouveau fichier partagé : **`src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx`** (export nommé + interface `ConstructionSectionProps`). Cela évite un import inter-tabs fragile.
- Retirer l'import `AdditionalConstructionBlock` s'il n'est plus utilisé.

**`src/components/cadastral/ccc-tabs/LocationTab.tsx`**
- Ajouter au composant les props construction/permis listées ci-dessus.
- Importer `ConstructionSection` depuis `./shared/ConstructionSection`.
- Insérer `<ConstructionSection ... />` **entre le bloc "Localisation administrative" (Card `province`/`section type`) et le `ParcelMapPreview`** — c.-à-d. avant le rendu conditionnel `sectionType === 'urbaine'`/`'rurale'` ? Non : juste **après** les blocs UrbanSection/RuralSection et **avant** le `ParcelMapPreview`, pour respecter "entre le premier bloc et la localisation sur la carte" (l'ensemble "administrative + section" forme le premier bloc logique).
- Le bloc Construction reste conditionnel sur `sectionType` (comme aujourd'hui le bloc Construction n'a pas cette contrainte dans Infos, mais l'ajouter dans Location impose de le montrer une fois la section connue — cohérent avec la carte).
  - **Décision** : afficher Construction dès que `formData.province` est renseigné (indépendamment de `sectionType`), pour ne pas bloquer la saisie construction avant le choix urbain/rural. À valider.

**`src/components/cadastral/CadastralContributionDialog.tsx`**
- Retirer du `<GeneralTab ... />` (lignes 168-194) toutes les props construction/permis énumérées ci-dessus.
- Ajouter ces mêmes props au `<LocationTab ... />` (lignes 198-216).

### Validation (Onglet Infos — Locking)
- Le hook `useFormValidation` détermine si l'onglet suivant est déblocable. Vérifier que la logique de validation "Infos" (`isGeneralComplete`) n'exige plus les champs construction, et que la validation "Localisation" (`isLocationComplete`) inclut désormais les champs construction/permis.
- **Fichier concerné** : `src/hooks/ccc/useFormValidation.ts` — déplacer les checks construction/permis de `isGeneralComplete` vers `isLocationComplete`. Le toast "onglet verrouillé" affichera automatiquement le bon libellé grâce au helper `getFirstLockingTabLabel` déjà en place.

### Non-régressions à vérifier après implémentation
- L'onglet Review continue d'afficher les données construction (props déjà passées via `state`).
- Les onglets Obligations et MarketValue reçoivent toujours `additionalConstructions` via `state` (aucun changement de plumbing DB).
- Le formulaire reset (`resetConstructionBlock`) fonctionne toujours depuis le nouveau parent Location.
- Aucun changement SQL, RLS, edge function, permissions, ni logique métier — pure réorganisation UI + validation.

## Détails techniques
- Aucune modification de type `CadastralContributionData`, aucune migration, aucun endpoint touché.
- L'extraction de `ConstructionSection` dans `shared/` respecte la convention de modularisation existante (`ccc-tabs/general/`, `ccc-tabs/market-value/`).
- Le prop drilling reste identique côté `useCCCFormState` ; seule la destination change (Location au lieu de General).
