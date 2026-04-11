

# Fix: Superposition des courbes sur la meme periode

## Probleme

Le `mergedData` actuel ne garantit pas que toutes les series partagent les memes points temporels. Si une nature n'a pas de donnees pour un mois donne, ce mois est absent pour cette serie, ce qui decale les courbes au lieu de les superposer sur le meme axe X.

## Solution

Modifier le calcul de `mergedData` dans `MultiAreaChartCard` (lignes 449-458 de `ChartCard.tsx`) pour :

1. Collecter l'union de TOUS les mois de TOUTES les series visibles
2. Trier chronologiquement
3. Pour chaque mois, remplir avec 0 les series qui n'ont pas de donnee ce mois-la

```text
// Pseudo-code du fix
const mergedData = useMemo(() => {
  // 1. Collecter tous les mois de toutes les series visibles
  const allMonths = new Set<string>();
  visibleSeries.forEach(s => s.data.forEach(pt => allMonths.add(pt.name)));
  
  // 2. Trier (les labels sont "janv. 25", etc.)
  const sorted = Array.from(allMonths).sort(/* tri chronologique */);
  
  // 3. Pour chaque mois, creer un objet avec toutes les valeurs
  return sorted.map(month => {
    const row: Record<string, any> = { name: month };
    visibleSeries.forEach((s, idx) => {
      const pt = s.data.find(d => d.name === month);
      row[`v${idx}`] = pt?.value ?? 0;  // 0 si pas de donnee
    });
    return row;
  });
}, [visibleSeries]);
```

Le tri chronologique utilisera un parsing des labels fr-FR ou, plus fiable, on triera en se basant sur l'ordre d'apparition dans la serie "Tous" (qui contient tous les mois).

## Fichier concerne

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/shared/ChartCard.tsx` | Corriger `mergedData` (lignes 449-458) pour aligner toutes les courbes sur le meme axe temporel |

**Impact** : ~15 lignes modifiees dans 1 fichier.

