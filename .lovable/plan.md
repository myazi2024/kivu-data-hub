

# Audit Config Admin — Bugs d'ordre et de type de chart

## Bug 1 : L'ordre des visuels ne s'applique pas

**Cause** : Les blocs analytics (TitleRequestsBlock, ContributionsBlock, etc.) rendent les charts dans un **ordre JSX hardcodé**. Le `display_order` sauvegardé en DB via l'admin est bien chargé par `useTabChartsConfig` et utilisé pour trier le tableau `merged`, mais **aucun bloc ne consomme cet ordre**. Chaque chart est placé manuellement dans le JSX :

```tsx
// TitleRequestsBlock.tsx — ordre figé
{v('request-type') && <ChartCard ... />}
{v('requester-type') && <ChartCard ... />}
{v('status') && <ChartCard ... />}
// ... toujours dans le même ordre
```

**Solution** : Remplacer les séquences de `{v('key') && <ChartCard .../>}` par un tableau de définitions de charts, trié dynamiquement par `getChartConfig(key)?.display_order`, puis mappé en JSX. Cela s'applique aux 13 blocs.

---

## Bug 2 : Le type de chart ne s'applique pas

**Cause** : Le `chart_type` est sauvegardé en DB et chargé dans `getChartConfig(key)?.chart_type`, mais **jamais lu par les blocs**. Le `type` est hardcodé dans chaque `<ChartCard>` :

```tsx
// Hardcodé — ignore la config admin
<ChartCard title={...} type="bar-h" ... />
<ChartCard title={...} type="donut" ... />
```

**Solution** : Remplacer le `type` hardcodé par `getChartConfig(key)?.chart_type || 'bar-h'` (fallback sur le type par défaut du registre).

---

## Plan d'implémentation

### Approche : Hook utilitaire + refactor des 13 blocs

**A. Enrichir `useBlockFilter`** pour exposer une fonction `chartType(key, fallback)` :
```typescript
const chartType = (key: string, fallback: ChartType) =>
  getChartConfig(key)?.chart_type || fallback;
```

**B. Enrichir `useBlockFilter`** pour exposer `getChartConfig` et `merged` (la liste triée) afin que les blocs puissent itérer par ordre configuré.

**C. Refactorer chaque bloc** (13 fichiers) pour :
1. Définir un tableau de chart definitions avec `key`, `component/props`, et `defaultType`
2. Trier ce tableau par `getChartConfig(key)?.display_order`
3. Utiliser `getChartConfig(key)?.chart_type || defaultType` pour le prop `type`
4. Mapper le tableau trié en JSX

### Exemple de refactor (TitleRequestsBlock) :

```tsx
const chartDefs = useMemo(() => [
  { key: 'request-type', el: () => <ChartCard title={ct('request-type', 'Type de demande')} 
    type={chartType('request-type', 'bar-h')} data={byRequestType} ... /> },
  { key: 'requester-type', el: () => <ChartCard title={ct('requester-type', 'Demandeur')} 
    type={chartType('requester-type', 'donut')} data={byRequesterType} ... /> },
  // ...
].filter(d => v(d.key))
 .sort((a, b) => (getChartConfig(a.key)?.display_order ?? 99) - (getChartConfig(b.key)?.display_order ?? 99)),
[...deps]);

// Render
<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
  {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
</div>
```

---

## Fichiers modifiés

- `src/hooks/useBlockFilter.ts` — exposer `chartType()` et `getChartConfig`
- 13 fichiers dans `src/components/visualizations/blocks/` — refactor pour ordre dynamique + type dynamique

## Section technique

Aucune migration requise. Les données sont déjà correctement sauvegardées en DB par l'admin. Seule la **consommation** côté rendu est manquante.

