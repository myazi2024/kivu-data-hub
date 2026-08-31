# Déplacer le champ « Hauteur » du croquis vers le bloc Construction

## Objectif

Dans le formulaire CCC, onglet Localisation, le champ « Hauteur » est aujourd'hui saisi dans le bloc « Croquis de la parcelle » (par construction tracée) et, pour les appartements, dans le bloc « Mesures et orientation de l'appartement ». Il doit être déplacé dans le bloc **Construction**, positionné **avant le champ « Standing »**, et suivre la même logique de dépendance que les autres champs de la cascade construction.

## État actuel (vérifié)

- `ParcelMapPreview.tsx:2801-2824` — chaque construction tracée dans le croquis expose un input « Hauteur : » (`shape.heightM`, min 3 m, bordure destructive + message si < 3 m).
- `LocationTab.tsx:691-699` — pour « Appartement », `apartmentHeight` est saisi dans `ApartmentMeasurements` (bloc qui remplace le croquis) ; il alimente aussi la carte « Volume » (l. 719-726).
- `ConstructionSection.tsx:287-334` — le bloc « Standing + Nombre d'étages » s'affiche uniquement si `constructionNature` est renseignée et ≠ « Non bâti » et `availableStandings.length > 0`.
- `useFormValidation.ts:328-335` — la validation exige déjà `heightM > 0` et `heightM >= 3` pour chaque `buildingShape` (hors Terrain nu et Appartement).
- Consommateurs en lecture seule de `heightM` / `apartmentHeight` (à conserver tels quels) : `ReviewTab.tsx`, `CCCDetailsDialog.tsx`, `ParcelsWithTitleBlock.tsx`, `useMapIndicators.ts`, `mapTabProfiles.ts`, payload `useCadastralContribution.tsx:380`.

## Modifications

### 1. Bloc Construction — construction principale (`ConstructionSection.tsx`)

- Ajouter un champ **« Hauteur (m) »** (input number, min 3, step 0.1) placé **immédiatement avant** le bloc « Standing + Nombre d'étages ».
- Visibilité : même condition que Standing — `constructionNature` renseignée et ≠ « Non bâti » (ce qui exclut automatiquement « Terrain nu » et les natures non bâties).
- Source de vérité inchangée : le champ lit/écrit `heightM` de la construction principale dans `buildingShapes` (shape liée à l'index 0 / première shape).
- Si aucune construction n'est encore tracée dans le croquis : le champ reste visible mais désactivé, avec une aide « Tracez d'abord la construction dans le croquis ci-dessous ». Dès qu'une shape existe, la valeur saisie s'y applique (synchronisation bidirectionnelle).
- Popover d'info reprenant la règle « Hauteur minimale : 3 m ».

### 2. Constructions additionnelles (`AdditionalConstructionBlock.tsx`)

- Ajouter le même champ « Hauteur (m) » avant Standing dans chaque construction additionnelle, lié à la shape dont `linkedIndex` correspond à cette construction, avec la même logique de dépendance et la même aide si la shape n'est pas encore tracée.

### 3. Croquis (`ParcelMapPreview.tsx`)

- Supprimer l'input « Hauteur : » et le message « Hauteur minimale : 3 m » de la liste des constructions tracées (l. 2801-2824). Conserver l'affichage en lecture seule de la hauteur à côté de la superficie (ex. `12,5 m² · H: 3 m`) pour garder le repère visuel.

### 4. Cas Appartement (`LocationTab.tsx` + `ConstructionSection.tsx`)

- Déplacer le champ « Hauteur (m) » de `ApartmentMeasurements` vers le bloc Construction (branche Appartement), avant Standing, avec les mêmes conditions de visibilité.
- `ApartmentMeasurements` conserve Longueur / Largeur / Orientation et les cartes Superficie / Périmètre ; la carte Volume continue de fonctionner car elle lit `formData.apartmentHeight` (désormais renseignée dans le bloc Construction).

### 5. Purge et validation

- Purge : quand la nature devient « Non bâti » / « Terrain nu » ou que la catégorie change, réinitialiser `heightM` des shapes et `apartmentHeight` (cohérent avec les purges existantes de la cascade dans `useConstructionCascade.ts` / `useCCCFormState.ts:1507-1509`).
- Validation (`useFormValidation.ts`) : inchangée — elle vérifie déjà `heightM` présent et ≥ 3 m par shape ; les libellés d'erreur restent valides puisque le champ reste dans l'onglet Localisation.

## Détails techniques

- Aucune migration base de données : `heightM` reste stocké dans le JSONB `building_shapes` et `apartment_height` en colonne — seul l'emplacement de saisie change.
- Tests : mettre à jour/étendre les tests existants (`useFormValidation.test.ts`, tests du croquis) pour couvrir : champ masqué pour Terrain nu / Non bâti, visible dès qu'une nature bâtie est sélectionnée, purge au changement de catégorie, et validation ≥ 3 m toujours bloquante.
- Vérifier visuellement (Playwright) : Villa (champ visible avant Standing), Terrain nu (champ absent), Appartement (champ dans Construction, volume recalculé), Immeuble multi-constructions (un champ hauteur par construction).
