# Hauteur/Nombre d'étages sur une ligne + tracé automatique calqué sur la parcelle

## 1. Mise en page Hauteur + Nombre d'étages (onglet Localisation, bloc Construction)

Aujourd'hui la « Hauteur » occupe une ligne entière, et « Standing » + « Nombre d'étages » sont sur la ligne suivante en deux colonnes.

Nouvelle disposition :

```text
[ Nombre d'étages ]  [ Hauteur (m) ]
[ Standing (pleine largeur) ]
```

- « Nombre d'étages » est déplacé à gauche, sur la même ligne que « Hauteur ».
- « Standing » passe sur sa propre ligne, pleine largeur.
- Cas Appartement : pas de « Nombre d'étages » (le champ « Numéro de l'étage » reste où il est) — la Hauteur reste seule sur sa ligne.
- Même changement appliqué aux constructions additionnelles (`AdditionalConstructionBlock.tsx`) pour rester cohérent.
- Aucune modification des règles de visibilité/validation existantes : « Nombre d'étages » ne s'affiche toujours que lorsque la nature de construction est renseignée et différente de « Non bâti ».

## 2. Bouton « Calquer sur la parcelle » dans le croquis

Dans « Croquis de la parcelle », sous le bouton « Tracer une construction » :

- Un second bouton apparaît **uniquement** lorsque le mode tracé de construction est actif (après clic sur « Tracer une construction »), et disparaît dès que le tracé est validé ou annulé.
- Libellé/infobulle : « Calquer sur la parcelle » — à utiliser quand la construction occupe exactement l'emprise de la parcelle.
- Au clic : la construction est créée automatiquement avec les mêmes sommets que le polygone de la parcelle (mêmes dimensions, même forme), côtés, superficie et périmètre recalculés comme pour un tracé manuel, puis rattachée à la construction cible sélectionnée. Le mode tracé se ferme et un toast confirme (superficie + périmètre), identique au tracé manuel.
- Le bouton est inactif si la parcelle n'a pas au moins 3 sommets valides.

## Détails techniques

- `ConstructionSection.tsx` : réorganisation du bloc lignes 319-384 (grille `grid-cols-2` contenant Nombre d'étages puis `BuildingHeightField`, Standing sorti en pleine largeur). Miroir dans `AdditionalConstructionBlock.tsx` (lignes ~449-510).
- `ParcelMapPreview.tsx` : nouveau callback `traceBuildingFromParcel` réutilisant la logique de `validateBuilding` (calcul `sides`, `calculateBuildingArea`, `perimeterM`, `linkedIndex = selectedBuildingTarget`) mais alimenté par `validCoords` au lieu de `buildingVertices`. Bouton rendu juste après le bouton construction, conditionné par `isDrawingBuilding`.
- Aucun changement de schéma ni de validation : `heightM` / `buildingHeight` et `floorNumber` conservent leur stockage actuel.
