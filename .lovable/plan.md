

# Ajustement automatique des lots lors du redimensionnement d'une voie

## Probleme
Quand on etire une voie pour modifier sa largeur (`widthM`), seule la voie est mise a jour. Les lots adjacents ne bougent pas, ce qui cree des chevauchements ou des espaces vides entre la voie et les lots.

## Solution
Modifier `handleUpdateRoad` dans `StepLotDesigner.tsx` pour detecter un changement de `widthM` et ajuster automatiquement les sommets des lots adjacents.

### Logique
1. Quand `updates.widthM` est present et different de l'ancien `widthM` :
   - Calculer le delta de demi-largeur en coordonnees normalisees : `deltaHalfNorm = ((newWidth - oldWidth) / 2) / sideLength`
   - Calculer la normale perpendiculaire a la voie (`nx`, `ny`)
   - Pour chaque lot, determiner de quel cote de la voie il se trouve (via son centroide)
   - Pousser les sommets du lot qui sont proches de la bordure de la voie de `deltaHalfNorm` dans la direction opposee a la voie
   - Recalculer `areaSqm` et `perimeterM`

2. Cette logique reprend exactement le pattern deja utilise dans `handleConvertEdgeToRoad` (lignes 433-478) mais applique un delta incremental au lieu d'une demi-largeur absolue.

### Fichier impacte

| Fichier | Modification |
|---------|-------------|
| `StepLotDesigner.tsx` | Enrichir `handleUpdateRoad` pour detecter un changement de `widthM` et ajuster les sommets des lots adjacents a la voie |

### Detail technique
- Identifier les lots adjacents : un lot est adjacent si au moins un de ses sommets est a une distance perpendiculaire < tolerance de la ligne centrale de la voie
- Tolerance dynamique : basee sur l'ancienne demi-largeur normalisee + marge
- Reutiliser `polygonArea` pour recalculer les superficies

