# Étages/hauteur, usage réel filtré, et informations de route enrichies

## 1. Cohérence « Nombre d'étages » ↔ « Hauteur »

Règle actuelle : hauteur min = 3 m × nombre d'étages (0 → 3, 1 → 3, 2 → 6).
Nouvelle règle : le rez-de-chaussée compte toujours pour 3 m, chaque étage ajoute 3 m.

| Étages | Hauteur minimale |
|--------|------------------|
| 0 (rez-de-chaussée) | 3 m |
| 1 | 6 m |
| 2 | 9 m |
| n | 3 × (n + 1) m |

- « 0 » reste la valeur par défaut du nombre d'étages et signifie rez-de-chaussée.
- Quand l'utilisateur change le nombre d'étages, la hauteur se met à jour automatiquement **uniquement** si elle est vide ou si elle correspond encore à l'ancien minimum ; une hauteur saisie manuellement plus élevée est conservée.
- L'aide et le message d'erreur expliquent le calcul : « 3 m pour le rez-de-chaussée + 3 m par étage ».
- Le cas Appartement reste à 3 m (son champ « étage » désigne le niveau, pas un nombre de niveaux).

## 2. « Usage réel » : masquer « Terrain vacant » hors terrain nu

La liste d'usage réel est aujourd'hui identique pour toutes les catégories. Elle exclura « Terrain vacant » (et variantes équivalentes du picklist) dès que la catégorie de bien n'est pas « Terrain nu ». Si l'utilisateur change de catégorie après avoir choisi « Terrain vacant », la valeur devenue invalide est effacée pour éviter une donnée incohérente.

## 3. « Limites et Entrées » → Informations sur la route

Pour chaque côté bordant une route, deux informations supplémentaires :

- **Revêtement de la route** (liste, après « Type de route ») : Asphalte / bitume, Béton, Pavés, Gravier / latérite, Terre battue, Non revêtue.
- **Présence d'un caniveau** (Oui / Non, après « Largeur (m) »).
  - Si **Oui** : question complémentaire « La parcelle est-elle raccordée au caniveau depuis ce côté ? » (Oui / Non).
  - Si **Non** : la question de raccordement est masquée et sa valeur effacée.

Sémantique et dépendances retenues :
- Le revêtement et le caniveau n'existent que pour un côté de type « route » — ils ne s'appliquent pas à un mur mitoyen.
- Le bouton « Ajouter » (confirmation d'un côté) exige désormais : type de route, largeur > 0, revêtement et réponse caniveau. Le raccordement est exigé seulement si un caniveau est déclaré.
- Retirer une route efface aussi revêtement, caniveau et raccordement du côté.
- Le badge de récapitulatif du côté affiche « type · revêtement · caniveau raccordé / non raccordé ».

Ces champs enrichissent les indicateurs d'accessibilité et d'assainissement (drainage) déjà exploités côté analyse foncière.

## 4. Affichage sur la carte cadastrale

- Les informations de route sont déjà enregistrées dans le champ `road_sides` de la parcelle ; il faut l'exposer dans la vue publique des parcelles pour qu'elles soient lisibles sur la carte.
- Panneau de la parcelle sélectionnée : nouvelle ligne compacte « Accès » listant chaque côté bordant une route (type, revêtement, largeur) et une pastille « Caniveau raccordé » / « Caniveau non raccordé » / « Sans caniveau ».
- Fiche cadastrale (document) : le tableau « Dimensions des côtés » de la section Localisation est complété d'un tableau « Informations sur la route » (côté, type, nom, largeur, revêtement, caniveau, raccordement), et le croquis reçoit les côtés routiers pour les matérialiser.
- Récapitulatif du formulaire et fiche Admin CCC affichent les mêmes nouvelles valeurs.

## Détails techniques

- `src/utils/buildingShapes.ts` : `minHeightForFloors` → `3 * (floors + 1)`, minimum 3.
- `BuildingHeightField.tsx` (libellés, `min`, placeholder), `ConstructionSection.tsx` et `AdditionalConstructionBlock.tsx` (auto-ajustement de la hauteur au changement d'étages), `src/hooks/ccc/useFormValidation.ts` (messages) et tests `useFormValidation.test.ts`.
- `src/utils/actualUsage.ts` : `buildActualUsageOptions(getPicklistDependentOptions, propertyCategory)` filtre « Terrain vacant » hors terrain nu ; nettoyage de la valeur dans `ConstructionSection.tsx` / `AdditionalConstructionBlock.tsx`.
- `RoadSideInfo` (`RoadBorderingSidesPanel.tsx`) : `roadSurface?`, `hasGutter?: boolean`, `gutterConnected?: boolean` ; UI (Select + RadioGroup), `canConfirm`, `handleRemoveRoad`.
- Propagation : `ParcelMapPreview.tsx` (init/merge des côtés), `useCCCFormState.ts` (restauration brouillon), `useCadastralContribution.tsx` (type `roadSides`), `ReviewTab.tsx`, `src/components/admin/ccc/CCCDetailsDialog.tsx`.
- Migration : recréer la vue `cadastral_parcels_public` en ajoutant `road_sides` (données non PII) ; `useCadastralMapData.tsx` sélectionne le champ et le type `ParcelData` l'expose.
- Affichage : `src/pages/CadastralMap.tsx` (panneau parcelle), `cadastral-document/sections/LocationSection.tsx` (tableau + `roadSides` passé à `ParcelSketchSVG`).
- Analytics : `src/hooks/useLandDataAnalytics.tsx` lit déjà `road_sides` ; aucun changement de requête nécessaire.

Vérification : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
