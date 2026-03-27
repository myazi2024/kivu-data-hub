

# Deplacement au clavier des lots et voies selectionnes

## Probleme

Quand un lot ou une voie est selectionne sur le canvas, les touches directionnelles (fleches haut/bas/gauche/droite) ne font rien. L'utilisateur s'attend a pouvoir nudger (deplacer finement) l'element selectionne avec le clavier.

## Solution

Ajouter le support des touches directionnelles dans `useCanvasKeyboard` et `LotCanvas` :

- **Fleches** : deplacent l'element selectionne (lot ou voie) de 1 pixel normalise (~0.002 en coordonnees normalisees)
- **Shift + Fleches** : deplacement x10 pour aller plus vite
- L'historique est pousse apres chaque nudge (via `setLotsWithHistory`)

## Details techniques

### 1. `useCanvasKeyboard.ts` — Ajouter `onArrowMove`

Ajouter un callback `onArrowMove?: (dx: number, dy: number) => void` dans `KeyboardActions`. Intercepter `ArrowUp/Down/Left/Right`, calculer le delta (1 ou 10 si Shift), appeler `onArrowMove(dx, dy)`.

### 2. `LotCanvas.tsx` — Implementer le nudge

Dans le bloc `useCanvasKeyboard`, ajouter `onArrowMove`:
- Si un **lot** est selectionne : deplacer tous ses vertices du delta normalise
- Si une **voie** est selectionnee : deplacer les vertices de la voie du meme delta
- Le pas normalise = `1 / (CANVAS_W - 2*PADDING)` pour 1px, x10 avec Shift

## Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `useCanvasKeyboard.ts` | Ajouter `onArrowMove` dans l'interface et le handler keydown |
| `LotCanvas.tsx` | Passer `onArrowMove` au hook avec la logique de deplacement lot/voie |

