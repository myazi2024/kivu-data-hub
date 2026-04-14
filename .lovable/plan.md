

# Ajout du visuel "Environnement sonore" dans l'onglet Parcelles

## Résumé

Ajouter un graphique "Environnement sonore" après "Hauteur construction" dans le bloc Parcelles des Analytics. Les données proviennent de `sound_environment` sur les contributions CCC.

## Modifications

### 1. `src/types/landAnalytics.ts` — Ajouter les champs au type
Ajouter `sound_environment?: string | null` et `nearby_noise_sources?: string | null` à l'interface `ContributionRecord` (après `building_shapes`, ligne 64).

### 2. `src/hooks/useLandDataAnalytics.tsx` — Inclure dans le SELECT
Ajouter `sound_environment, nearby_noise_sources` à la chaîne SELECT des contributions (ligne 91).

### 3. `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` — Ajouter le visuel

- Importer `Volume2` depuis lucide-react et `SOUND_LABELS` depuis `@/constants/expertiseLabels`
- Ajouter un `useMemo` `soundEnvData` qui fait un `countBy` sur `filteredContribs` pour `sound_environment`, en traduisant les clés via `SOUND_LABELS` (tres_calme → "Très calme", etc.)
- Insérer une entrée `{ key: 'sound-env', ... }` dans `chartDefs` après `building-height`, avec type donut, icon `Volume2`, colorIndex 10
- Ajouter `soundEnvData` aux dépendances du `useMemo` de `chartDefs`

### 4. `src/config/crossVariables.ts` — Ajouter les croisements
Ajouter dans le bloc `'parcels-titled'` :
```
'sound-env': [{ label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }],
```

## Fichiers impactés
- `src/types/landAnalytics.ts`
- `src/hooks/useLandDataAnalytics.tsx`
- `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`
- `src/config/crossVariables.ts`

