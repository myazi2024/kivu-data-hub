# Suppression d'une construction : le tracé reste affiché sur la carte

## Origine du bug (confirmée)

Dans `ParcelMapPreview.tsx`, tout le rendu Leaflet (bornes, polygone parcelle, dimensions **et constructions**) se fait dans un seul grand `useEffect` dont le tableau de dépendances (ligne 1293) est :

```text
[isMapReady, validCoords, roadSides, mapConfig, isGroupDragMode,
 isDrawingMode, selectedBorne, isDrawingBuilding, buildingVertices]
```

`buildingShapes` n'y figure pas, alors que le corps de l'effet dessine `buildingShapes.forEach(...)` (ligne 1049). Conséquence : quand `removeBuildingById` (ligne 1313) retire la forme de l'état, la liste sous la carte se met bien à jour, mais l'effet ne se rejoue pas — le polygone rouge, ses sommets et ses étiquettes de côtés restent sur la carte jusqu'à un autre déclencheur (déplacement de borne, nouveau tracé...). Le même défaut touche l'édition d'un sommet par GPS et la réattribution d'un libellé (`constructionLabels` aussi absent des dépendances).

## Correction

1. Extraire le dessin des constructions du grand effet vers un `useEffect` dédié, avec son propre `L.LayerGroup` (`buildingLayerGroupRef`) :
   - dépendances : `[isMapReady, buildingShapes, buildingVertices, isDrawingBuilding, constructionLabels, isDrawingMode, isGroupDragMode]`
   - nettoyage : `layerGroup.clearLayers()` en début de rendu et à l'unmount, avec la garde existante `bvDragActiveRef` pour ne pas casser un drag de sommet en cours.
   - les listeners `map.on('mousemove'/'touchmove')` attachés par sommet sont retirés dans la fonction de nettoyage (fuite actuelle : ils s'accumulent à chaque redraw).
2. Le grand effet ne touche plus aux couches de construction ; `buildingLayersRef` est remplacé par le layer group.
3. `removeBuildingById` : purge complète — la forme retirée et, si aucune autre forme ne pointe sur ce `linkedIndex`, on ne renumérote pas les autres (comportement actuel conservé) ; on ferme aussi l'éditeur de sommet ouvert (`editingBuildingVertex`) s'il visait la forme supprimée, pour éviter un panneau orphelin.

## Optimisations de la fonctionnalité

- **Confirmation + annulation** : la suppression demande une confirmation (AlertDialog) puis affiche un toast « Construction supprimée » avec action « Annuler » qui restaure la forme (état conservé en ref le temps du toast).
- **Redraw ciblé** : signature mémoïsée des formes (id + sommets + libellé) pour ne redessiner que lorsqu'elles changent réellement, évitant les scintillements pendant le pan/zoom.
- **Retour visuel** : survol d'une ligne de la liste = mise en surbrillance du polygone correspondant sur la carte.
- **Cohérence hauteur** : la hauteur saisie dans le bloc Construction n'est pas perdue par la suppression du tracé (elle reste dans `buildingHeight` / `heightM` du formulaire, comportement déjà en place) — vérification par test.

## Détails techniques

- Fichier principal : `src/components/cadastral/ParcelMapPreview.tsx` (effet lignes ~760-1293, `removeBuildingById` ligne 1313, liste sous la carte lignes ~2817-2890).
- Aucune modification de schéma ni de validation ; `useCCCFormState` et `useFormValidation` restent inchangés.
- Test ajouté : suppression d'une forme → `onBuildingShapesChange` appelé sans la forme, et la hauteur du formulaire est préservée.
