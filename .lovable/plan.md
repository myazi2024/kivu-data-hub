
# Refonte de la rotation omnidirectionnelle

## Constat
La rotation actuelle est trop fragile car elle repose sur une petite poignée externe au-dessus de la forme, branchée dans le flux général de `mousemove`. Même si le calcul d’angle a été corrigé, l’intégration UX reste mauvaise :
- la poignée est difficile à attraper,
- elle peut sortir de la zone visible,
- son comportement entre lots et voies n’est pas assez robuste,
- elle entre en concurrence avec les autres interactions du canvas.

## Refonte proposée
Remplacer la logique actuelle par une interaction de rotation plus directe et plus fiable, basée sur un **mode de rotation actif sur la sélection** plutôt que sur une petite poignée isolée.

### 1. Nouveau principe d’interaction
Quand une **voie**, une **ligne** ou un **lot** est sélectionné :
- afficher un **anneau de rotation** centré sur l’élément sélectionné,
- afficher une **poignée plus grande** positionnée sur ce cercle,
- permettre la rotation en cliquant-glissant sur :
  - la poignée,
  - ou directement l