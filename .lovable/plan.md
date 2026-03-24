

# Amélioration de la légende choroplèthe "Densité parcelles"

## Constat

La légende actuelle affiche un dégradé vert continu de `0` à `maxParcels` (ex: 61) avec seulement 2 repères (min/max). Problèmes :
- **Pas de paliers lisibles** : l'utilisateur ne peut pas associer une couleur à une plage de valeurs
- **L'échelle est relative** : `maxParcels` change dynamiquement, ce qui rend les couleurs non comparables d'une session à l'autre
- **Pas de correspondance explicite** avec les 4 niveaux de densité déjà définis (`Faible`, `Modéré`, `Élevé`, `Très élevé`)
- **La carte utilise un dégradé HSL continu** (`getProvinceColor`) mais la légende ne montre pas les seuils

## Plan

### 1. Remplacer le dégradé continu par une légende à 4 paliers

Aligner la légende sur les 4 niveaux de densité déjà calculés (ligne 124 de `DRCInteractiveMap.tsx`) :

| Niveau | Seuil (parcelles) | Couleur |
|--------|-------------------|---------|
| Faible | 0 – 30 | Vert clair |
| Modéré | 31 – 100 | Jaune/ambre |
| Élevé | 101 – 500 | Orange |
| Très élevé | > 500 | Rouge foncé |

### 2. Aligner `getProvinceColor()` sur ces 4 paliers

Actuellement, la couleur est un dégradé vert proportionnel à `maxParcels`. Remplacer par une palette à 4 couleurs discrètes correspondant aux seuils ci-dessus. Cela rend les couleurs **stables** (indépendantes de maxParcels) et **cohérentes** avec le `densityLevel` affiché dans le tooltip.

### 3. Mettre à jour la légende visuelle

Remplacer le dégradé linéaire par 4 carrés de couleur avec leurs labels :
```
■ Faible (0-30)  ■ Modéré (31-100)  ■ Élevé (101-500)  ■ Très élevé (>500)
```

### 4. Aligner `DRCMap.tsx` hover

La couleur au survol (ligne 118) est forcée à rouge — la conserver car c'est un feedback d'interaction, pas une donnée.

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/DRCInteractiveMap.tsx` | Refactorer `getProvinceColor()` + légende à 4 paliers |

1 fichier, modifications ciblées.

