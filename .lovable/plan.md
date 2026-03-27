

# Ajout de la rotation pour lots et voies selectionnees

## Probleme

Quand un lot ou une voie est selectionne, il n'y a aucun moyen de le faire pivoter. L'utilisateur doit repositionner chaque sommet manuellement.

## Solution

Ajouter une poignee de rotation visuelle (icone circulaire au-dessus de l'element selectionne) + support clavier (touches `R`/`Shift+R` pour rotation par increments).

### Interaction visuelle (poignee SVG)

- Quand un lot ou une voie est selectionne, afficher un **cercle de rotation** (↻) au-dessus du centre de l'element, relie par une ligne pointillee
- Le drag de cette poignee fait pivoter tous les sommets autour du centre de gravite de l'element
- Pendant le drag, afficher l'angle de rotation en degres a cote de la poignee

### Interaction clavier

- **R** : rotation de +5° (sens horaire)
- **Shift+R** : rotation de -5° (sens anti-horaire)
- Fonctionne sur le lot ou la voie selectionne

### Logique geometrique

Rotation de chaque sommet `(x, y)` autour du centre `(cx, cy)` par angle `θ` :
```
x' = cx + (x - cx) * cos(θ) - (y - cy) * sin(θ)
y' = cy + (x - cx) * sin(θ) + (y - cy) * cos(θ)
```

## Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `useCanvasKeyboard.ts` | Ajouter `onRotate?: (angleDeg: number) => void` + touches `R` / `Shift+R` |
| `LotCanvas.tsx` | Ajouter la poignee SVG de rotation (cercle + ligne), gerer le drag rotation, implementer `onRotate` dans le hook clavier, appliquer la transformation geometrique aux sommets du lot ou de la voie |

