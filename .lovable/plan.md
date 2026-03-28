

# Amelioration du rendu visuel des voies

## Problemes identifies

1. **Limites de voie floues** : La voie est rendue comme une polyline semi-transparente sans bords nets. Il n'y a pas de lignes de bordure visibles delimitant les deux cotes de la voie.

2. **Mesures mal orientees** : Le label `{road.name} ({road.widthM}m)` est place a cote de la voie avec un offset, mais n'est pas oriente perpendiculairement a la longueur de la voie. Il devrait etre ecrit a l'interieur de la voie, perpendiculairement a son axe.

## Solution

### 1. Bordures nettes de la voie
Remplacer le rendu actuel (polyline epaisse semi-transparente) par un **polygone ferme** representant l'emprise reelle de la voie, avec deux lignes de bordure distinctes :
- Calculer les 4 coins du rectangle de la voie en decalant les extremites de `halfWidth` dans la direction normale
- Dessiner un `polygon` rempli (fond clair) avec un contour net
- Ajouter deux `polyline` pour les bordures gauche et droite (trait plein, opacite forte)

### 2. Mesure perpendiculaire dans la voie
Remplacer le label actuel par un texte place au centre de la voie, oriente perpendiculairement a l'axe :
- Calculer l'angle de la voie : `angle = atan2(dy, dx)`
- Appliquer une rotation de 90° au texte via `transform="rotate(...)"`
- Placer le texte au milieu de la voie (sans offset)
- Afficher uniquement la largeur (`{road.widthM}m`) en perpendiculaire, et le nom au-dessus

## Fichier impacte

| Fichier | Modification |
|---------|-------------|
| `LotCanvas.tsx` (lignes ~822-960) | Refaire le rendu SVG des voies : polygone avec bordures nettes + texte de mesure perpendiculaire |

## Detail technique

Pour construire le polygone de la voie a partir d'un segment `p0→p1` :
```text
  TL -------- TR
  |   voie    |
  BL -------- BR

TL = p0 + normal * halfW
TR = p1 + normal * halfW
BR = p1 - normal * halfW
BL = p0 - normal * halfW
```

Pour le texte perpendiculaire :
```text
transform="rotate(roadAngle + 90, mx, my)"
```
Avec correction pour eviter le texte a l'envers (si angle > 90° ou < -90°, ajouter 180°).

