

# Animation de détachement de province sur la Carte RDC

## Principe

Quand l'utilisateur clique sur une province, la carte effectue une transition animée :
1. Les autres provinces s'estompent (opacity → 0)
2. Le `viewBox` du SVG s'anime pour zoomer sur le bounding box de la province cliquée
3. La province sélectionnée remplit tout l'espace disponible
4. Un bouton "Retour à la carte" apparaît pour restaurer la vue complète

## Implémentation technique

### `DRCMapWithTooltip.tsx` — Animation viewBox + fade

- Ajouter un state `zoomedProvinceId` pour suivre la province zoomée
- Au clic sur une province :
  - Lire le `getBBox()` du path SVG cliqué pour obtenir ses coordonnées internes (x, y, width, height)
  - Modifier le `viewBox` du SVG avec une transition CSS (`transition: viewBox` n'existant pas, utiliser un `requestAnimationFrame` loop ou manipuler directement via `setAttribute` avec un interval)
  - Appliquer `opacity: 0.05` + `pointer-events: none` sur tous les paths sauf celui sélectionné
  - Appliquer `stroke-width: 3` + couleur accent sur le path sélectionné
- Au clic "Retour" :
  - Restaurer le viewBox original
  - Restaurer l'opacité de tous les paths

Approche concrète : interpolation linéaire du viewBox sur ~500ms via `requestAnimationFrame` pour une animation fluide.

### `DRCMapWithTooltip.tsx` — Bouton retour

- Afficher un bouton "← Retour à la carte RDC" en overlay quand une province est zoomée
- Le bouton déclenche l'animation inverse

### `DRCInteractiveMap.tsx` — Coordination

- Le callback `onProvinceSelect` déclenche déjà l'affichage des détails dans le panneau latéral
- Ajouter la propagation du state `isZoomed` pour masquer la légende choroplèthe pendant le zoom

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/DRCMapWithTooltip.tsx` | Animation viewBox + fade des autres provinces + bouton retour |
| `src/components/DRCInteractiveMap.tsx` | Masquer légende pendant le zoom |

2 fichiers modifiés.

