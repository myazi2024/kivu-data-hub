

# Ajouter l'effet zoom-in lors du clic sur un territoire

## Problème

Quand l'utilisateur clique un territoire en mode `showAll`, le parent (`DRCInteractiveMap`) change de branche conditionnelle :
- Avant clic : branche `showAll` → instance A de `DRCTerritoiresMap`  
- Après clic : branche `selectedTerritoire && selectedProvince` → instance B (remontée)

Le composant est détruit puis recréé avec de nouvelles props, donc aucune animation de transition n'est possible.

## Solution

Unifier les 3 branches territoire en une seule instance de `DRCTerritoiresMap` qui reste montée, puis animer le changement de bbox à l'intérieur du composant.

### 1. `DRCInteractiveMap.tsx` — Fusionner les 3 branches territoire

Remplacer les 3 conditions (territoire+province, rurale+province, rurale+!province) par une seule :

```text
condition: selectedSectionType === 'rurale' || (selectedTerritoire && selectedProvince)
```

Passer toutes les props nécessaires à une seule instance :
- `showAll` = `!selectedProvince`
- `province` = `selectedProvince?.name`
- `territoire` = `selectedTerritoire`
- `territoireNames` = province ? getTerritoiresForProvince(...) : undefined
- `onTerritoireSelect` = handler unifié (résolution province + setState)

### 2. `DRCTerritoiresMap.tsx` — Animer la transition de bbox

Ajouter une interpolation animée entre l'ancien et le nouveau bbox :

- Séparer `targetBbox` (calculé par useMemo, comme maintenant) et `animatedBbox` (état affiché)
- Utiliser `requestAnimationFrame` pour interpoler linéairement (`lerp`) entre `animatedBbox` et `targetBbox` sur ~400ms
- Les paths SVG utilisent `animatedBbox` pour la projection → le zoom est fluide
- Ajouter `transition-opacity` sur les labels pour un fade-in doux

### 3. Détail technique — Interpolation bbox

```ts
// Nouveau state
const [animBbox, setAnimBbox] = useState(targetBbox);
const animRef = useRef({ start: 0, from: targetBbox, to: targetBbox });

useEffect(() => {
  animRef.current = { start: performance.now(), from: animBbox, to: targetBbox };
  const duration = 400;
  const tick = (now: number) => {
    const t = Math.min((now - animRef.current.start) / duration, 1);
    const ease = t * (2 - t); // easeOutQuad
    const lerp = (a: number, b: number) => a + (b - a) * ease;
    setAnimBbox({
      minLng: lerp(animRef.current.from.minLng, animRef.current.to.minLng),
      maxLng: lerp(animRef.current.from.maxLng, animRef.current.to.maxLng),
      minLat: lerp(animRef.current.from.minLat, animRef.current.to.minLat),
      maxLat: lerp(animRef.current.from.maxLat, animRef.current.to.maxLat),
    });
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, [targetBbox]);
```

Utiliser `animBbox` au lieu de `bbox` dans `projectFeature` et `centroid`.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/DRCInteractiveMap.tsx` | Fusionner 3 branches → 1 seule instance DRCTerritoiresMap |
| `src/components/DRCTerritoiresMap.tsx` | Ajouter interpolation animée du bbox (zoom-in fluide) |

