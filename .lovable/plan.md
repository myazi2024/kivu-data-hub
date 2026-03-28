

# Fusion automatique des limites de lots séparés de moins de 0.5m

## Problème
Quand deux lots sont très proches (< 0.5m) sans être exactement bord à bord, la validation détecte un chevauchement ou un interstice. Les sommets proches doivent être fusionnés (snappés) pour créer une limite mitoyenne propre.

## Solution
Ajouter une fonction `snapNearbyLotVertices` qui, pour chaque paire de lots, fusionne les sommets distants de moins de 0.5m (en coordonnées réelles). Appelée avant la validation et après chaque modification de lot.

## Changements

### 1. `utils/geometry.ts` — Nouvelle fonction `snapNearbyLotVertices`
- Prend la liste de lots et `parentAreaSqm` (pour convertir la distance normalisée en mètres)
- Pour chaque paire de lots, compare chaque sommet du lot A avec chaque sommet du lot B
- Si la distance réelle < 0.5m (soit `0.5 / sqrt(parentAreaSqm)` en coordonnées normalisées), déplacer les deux sommets vers leur point médian
- Recalculer `areaSqm` et `perimeterM` des lots modifiés
- Aussi snapper les sommets proches d'une **arête** (pas seulement d'un autre sommet) : si un sommet est à < 0.5m d'une arête d'un lot voisin, le projeter sur cette arête

### 2. `hooks/useSubdivisionForm.ts` — Appeler le snap
- Dans `runValidation` : appeler `snapNearbyLotVertices(lots, parentAreaSqm)` avant `validateSubdivision`, et mettre à jour les lots si des fusions ont eu lieu
- Aussi l'appeler dans les handlers de fin de manipulation (après drag, après coupe)

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `utils/geometry.ts` | Ajouter `snapNearbyLotVertices` — fusionne sommets et projette sur arêtes voisines si < 0.5m |
| `hooks/useSubdivisionForm.ts` | Appeler le snap avant validation et après les modifications de lots |

