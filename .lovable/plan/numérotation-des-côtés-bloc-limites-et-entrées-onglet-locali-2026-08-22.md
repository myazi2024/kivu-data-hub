# Numérotation des côtés — bloc « Limites et Entrées » (onglet Localisation)

## Problème constaté

Les côtés affichés dans « Limites et Entrées » peuvent porter des numéros non séquentiels (ex. Côté 1, Côté 2, Côté 4) et décorrélés de la pastille d'ordre affichée à gauche.

Causes vérifiées dans le code :

- `src/hooks/useCCCFormState.ts` — `removeParcelSide` et `removeGPSCoordinate` retirent l'élément du tableau sans renommer les suivants : le nom « Côté N » reste figé alors que la position change. Idem pour « Borne N ».
- `src/hooks/useCCCFormState.ts` — `addParcelSide` nomme le nouveau côté `Côté ${parcelSides.length + 1}` : après une suppression, ce numéro peut dupliquer un nom existant.
- `src/components/cadastral/ParcelMapPreview.tsx` (~l.344-352) — l'appariement d'un côté existant se fait via `parseInt(current.borne)` sur une chaîne du type « Borne 3 », ce qui vaut `NaN` : la recherche échoue toujours et le nom désordonné est simplement reconduit à l'index courant.
- `src/components/cadastral/ParcelSidesDimensionsPanel.tsx` (l.280-283) — affiche la pastille `index + 1` à côté de `side.name`, rendant l'incohérence visible.

## Correctifs proposés

1. Numérotation canonique par position
   - Ajouter un utilitaire de renumérotation qui, après toute mutation du tableau, réattribue les noms séquentiels « Côté 1..N » — sauf pour un côté renommé manuellement par l'utilisateur (nom ne correspondant pas au motif `Côté \d+`, ou nom cardinal type « Côté Nord »), qui est conservé tel quel.
   - Appliquer la même règle aux bornes : « Borne 1..N ».

2. `useCCCFormState.ts`
   - `addParcelSide` : nommer d'après la position finale, puis renuméroter.
   - `removeParcelSide` et `removeGPSCoordinate` : renuméroter côtés et bornes après filtrage.
   - Restauration depuis brouillon/DB (`parcel_sides`, `gps_coordinates`) : renuméroter les entrées dont le nom est vide ou suit le motif générique, afin de corriger les dossiers déjà enregistrés en désordre.

3. `ParcelMapPreview.tsx`
   - Corriger l'appariement : extraire le numéro de borne via une regex (`/(\d+)/`) au lieu de `parseInt` sur le libellé complet, et se rabattre sur l'index positionnel avec un nom recalculé « Côté i+1 » plutôt que sur un ancien nom désordonné.
   - Idem pour les deux autres endroits qui reconstruisent les côtés depuis les coordonnées (l.~1161, ~1741, ~2220) afin qu'ils restent séquentiels.

4. Cohérence des « roadSides »
   - Après suppression d'un côté/borne, réindexer `sideIndex` des `roadSides` (décalage des index supérieurs, suppression de l'entrée du côté retiré) pour que le type de limite, l'entrée et l'orientation restent attachés au bon côté.

## Portée

Aucune modification de schéma. Changements limités à la génération/numérotation des côtés et bornes et à leur affichage ; les valeurs saisies (longueurs, type de limite, entrée) sont préservées et suivent leur côté.
