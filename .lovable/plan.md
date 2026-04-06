

# Zoom dynamique sur commune/quartier selectionne

## Probleme

Quand une commune est selectionnee dans `DRCCommunesMap`, le bounding box est calcule sur **toutes les communes de la ville** — la commune selectionnee est simplement coloree differemment mais pas zoomee. Meme probleme dans `DRCQuartiersMap` pour les quartiers.

## Correction

### DRCCommunesMap.tsx

Modifier le `useMemo` du `bbox` pour que, quand `commune` est defini, le bounding box soit calcule uniquement sur la feature correspondante (celle ou `name === commune`). Si la commune selectionnee n'est pas trouvee, fallback sur toutes les communes de la ville.

```typescript
const bbox = useMemo(() => {
  const source = commune
    ? filtered.filter(f => f.properties.name.toLowerCase() === commune.toLowerCase())
    : filtered;
  const target = source.length > 0 ? source : filtered;
  // ... calcul bbox sur target
}, [filtered, commune]);
```

### DRCQuartiersMap.tsx

Meme logique : quand `quartier` est defini, le bounding box se calcule uniquement sur la feature ou `name === quartier`.

```typescript
const bbox = useMemo(() => {
  const source = quartier
    ? filtered.filter(f => f.properties.name.toLowerCase() === quartier.toLowerCase())
    : filtered;
  const target = source.length > 0 ? source : filtered;
  // ... calcul bbox sur target
}, [filtered, quartier]);
```

Dans les deux cas, toutes les features voisines restent rendues (visibles) mais le cadrage SVG est centre et zoome sur l'element selectionne.

### Fichiers modifies
- `src/components/DRCCommunesMap.tsx` — bbox conditionnel sur commune
- `src/components/DRCQuartiersMap.tsx` — bbox conditionnel sur quartier

