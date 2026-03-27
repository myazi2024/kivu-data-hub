

# Ajustement visuel de la largeur des voies sur le canvas

## Probleme

La largeur d'une voie peut etre modifiee via l'input numerique dans le panneau lateral (quand la voie est selectionnee), mais l'utilisateur ne peut pas ajuster visuellement la largeur directement sur le canvas par drag. Ce n'est pas intuitif — l'utilisateur s'attend a pouvoir etirer les bords de la voie.

## Solution

### 1. Poignees de largeur sur les voies selectionnees

Quand une voie est selectionnee en mode `select`, afficher **deux poignees laterales** (petits carres) au milieu de la voie, perpendiculaires a la direction. L'utilisateur les drag pour elargir ou retrecir la voie. Le `widthM` est mis a jour en temps reel.

```text
     ◻ ← poignee haut (drag perpendiculaire)
     |
  ═══════  ← voie (polyline)
     |
     ◻ ← poignee bas
```

- Position : au milieu du segment central, decalees de `roadWidthPx/2` dans la direction perpendiculaire
- Drag : mouvement projete sur la normale → delta converti en metres via `sideLength`
- Contrainte : largeur min 2m, max 30m
- Feedback : le rectangle de largeur se redimensionne en temps reel pendant le drag

### 2. Slider de largeur dans le panneau lateral

Remplacer l'input numerique seul par un **Slider + Input** combines pour un ajustement plus fluide (range 2-30m, step 0.5m). L'input reste pour la saisie precise.

### 3. Preview de largeur pendant le trace

Pendant le mode `drawLine` quand l'utilisateur choisit "Creer une voie", afficher la bande de largeur preset en preview semi-transparente autour de la ligne tracee (deja partiellement implemente, a verifier et corriger).

## Fichiers impactes

| Action | Fichier |
|--------|---------|
| Modifie | `LotCanvas.tsx` — Ajouter poignees de largeur (rects SVG) sur voie selectionnee, gerer le drag perpendiculaire, mettre a jour `widthM` en temps reel |
| Modifie | `StepLotDesigner.tsx` — Remplacer input largeur par Slider + Input combines |

