

# Remplacer CadastralMap par ParcelSketchSVG dans la fiche cadastrale

## Constat

La section "Croquis du terrain" dans `LocationSection.tsx` utilise `CadastralMap` (carte interactive Leaflet). L'utilisateur veut un croquis SVG statique comme dans le service de lotissement, via le composant `ParcelSketchSVG` déjà existant.

## Données disponibles

`ParcelSketchSVG` accepte :
- `coordinates` (requis) → disponible via `parcel.gps_coordinates`
- `parcelSides` (requis) → disponible via `parcel.parcel_sides`
- `buildingShapes` (optionnel) → **pas sur `cadastral_parcels`**, passer `[]`
- `roadSides` (optionnel) → **pas sur `cadastral_parcels`**, passer `[]`
- `servitude` (optionnel) → pas disponible, omis

Les deux champs essentiels (coordonnées GPS + côtés) sont présents sur la parcelle, ce qui suffit pour un croquis fidèle avec bornes, dimensions et orientations.

## Modification

### `sections/LocationSection.tsx`

1. Remplacer l'import `CadastralMap` par `ParcelSketchSVG`
2. Adapter le bloc "Croquis du terrain" :
   - Mapper `parcel.gps_coordinates` au format `{ lat, lng, borne }[]`
   - Mapper `parcel.parcel_sides` au format `{ name, length, orientation }[]` attendu par `ParcelSketchSVG`
   - Passer `buildingShapes={[]}` (données non disponibles sur la table parcelle)
3. Supprimer la condition `hasMap` basée sur lat/lng seuls → la baser sur `gps_coordinates.length >= 3`

### Fichier impacté

| Fichier | Modification |
|---|---|
| `sections/LocationSection.tsx` | Remplacer `CadastralMap` par `ParcelSketchSVG`, adapter le mapping des props |

