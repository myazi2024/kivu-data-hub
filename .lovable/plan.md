

## Plan — Réparer Zoom / Pan / Drag dans le canvas Lots

### Diagnostic

Trois bugs distincts empêchent les interactions canvas dans l'onglet Lots :

#### Bug #1 — Wheel zoom inopérant (cause racine)

Dans `LotCanvas.tsx` (ligne 688), `onWheel={viewport.handleWheel}` utilise le système d'événements synthétiques React. Depuis React 17+, **les listeners `onWheel`/`onTouchMove` sont attachés en mode `passive` par défaut** : `e.preventDefault()` à l'intérieur de `handleWheel` (ligne 22 de `useCanvasViewport.ts`) est ignoré silencieusement et déclenche un warning console.

Conséquence : la molette fait défiler la page entière au lieu de zoomer le canvas → l'utilisateur a l'impression que le zoom ne marche pas.

#### Bug #2 — Pan caché derrière un raccourci clavier obscur

Dans `handleMouseDown` (ligne 353), le pan ne se déclenche que si :
- `Espace` est maintenu, **OU**
- bouton du milieu de la souris

Aucun indicateur UI ne le signale. Sur trackpad ou souris sans molette cliquable, l'utilisateur ne peut **pas** déplacer la vue. Pire : en mode `drawLine`/`drawRoad`, un clic gauche démarre immédiatement un tracé (ligne 359).

#### Bug #3 — Boutons Zoom +/-/Reset masqués par les outils flottants

Les contrôles zoom sont positionnés `absolute top-2 right-2 z-10` (ligne 661), mais l'onglet Lots a une barre d'outils flottante (mode select/drawLine/drawRoad/etc.) qui se superpose à la même zone à certaines largeurs (viewport 875×494 confirmé du replay). Les clics atterrissent sur la barre d'outils, pas sur les boutons zoom.

### Correctifs

#### 1. `useCanvasViewport.ts` — Wheel non-passif

Ajouter un `useEffect` qui attache manuellement le listener wheel sur la ref SVG avec `{ passive: false }`, et retirer le `onWheel` JSX. Exposer une `setSvgRef` ou accepter directement la ref SVG en paramètre :

```ts
useEffect(() => {
  const el = svgRef.current;
  if (!el) return;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * delta)),
    }));
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}, [svgRef]);
```

Bonus : implémenter le **zoom centré sur le curseur** (lire `e.offsetX/Y`, ajuster `panX/panY` pour conserver le point sous le curseur stable) — comportement standard attendu.

#### 2. `LotCanvas.tsx` — Pan accessible en mode `select`

Modifier `handleMouseDown` pour autoriser le pan par **clic-gauche-glisser sur fond vide en mode `select`** :

- Si `mode === 'select'` ET le clic n'a pas atterri sur un lot/route/edge/vertex (target = `<svg>` ou `<g>` racine), démarrer un pan.
- Conserver Space+drag et middle-click comme alternatives.
- Ajouter un curseur dynamique (`grab` / `grabbing`) quand on survole le fond.

#### 3. `LotCanvas.tsx` — Découplage des contrôles zoom

Repositionner les boutons Zoom +/-/Reset/Snap dans un conteneur `top-2 left-2` (côté opposé à la barre d'outils flottante) ou augmenter le `z-index` à `z-20` et ajouter `pointer-events-auto`. Vérifier en viewport 875×494 qu'aucun élément ne les recouvre.

#### 4. Indicateur visuel du mode pan

Ajouter une mini-légende discrète sous les boutons zoom : « Glisser : déplacer · Molette : zoom · Espace : pan forcé ».

### Vérification

1. Onglet Lots → molette = zoom (pas de scroll de page), centré sur curseur.
2. Mode Sélection, clic-glisser sur fond vide = la vue se déplace, curseur `grabbing`.
3. Boutons +/-/Reset toujours cliquables, jamais masqués.
4. Espace + drag continue de fonctionner partout (y compris en mode Diviser).
5. Aucun warning console « Unable to preventDefault inside passive event listener ».

### Fichiers modifiés

- `src/components/cadastral/subdivision/hooks/useCanvasViewport.ts` (wheel non-passif + zoom centré curseur, accepter `svgRef`)
- `src/components/cadastral/subdivision/LotCanvas.tsx` (pan en mode select, repositionnement boutons, légende, retrait `onWheel` JSX)

Aucun changement BD ni edge function.

