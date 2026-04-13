

# Fix — Réordonnancement des graphiques ne fonctionne pas

## Cause racine

La fonction `moveItem` (ligne 151) **échange les valeurs** de `display_order` entre deux items adjacents :

```typescript
const tempOrder = typeItems[idx].display_order;
typeItems[idx] = { ...typeItems[idx], display_order: typeItems[swapIdx].display_order };
typeItems[swapIdx] = { ...typeItems[swapIdx], display_order: tempOrder };
```

**Problème** : si deux items ont le même `display_order` (cas fréquent après sauvegarde partielle, ou quand certains items ont des overrides DB et d'autres non), le swap est un **no-op** — échanger deux valeurs identiques ne change rien.

De plus, lors de l'initialisation (`useInitializedConfig.ts` ligne 35-38), les items sans override DB gardent le `display_order` du registre, tandis que ceux avec override prennent la valeur DB. Si un admin a sauvegardé certains items mais pas tous, les ordres peuvent se chevaucher.

## Solution

Remplacer le swap de valeurs par une **réindexation séquentielle** après permutation de position dans le tableau :

```typescript
const moveItem = useCallback((itemKey: string, direction: 'up' | 'down', type: 'kpi' | 'chart') => {
  setLocalItems(prev => {
    const items = [...(prev[activeTab] || [])];
    const typeItems = items.filter(i => i.item_type === type);
    const idx = typeItems.findIndex(i => i.item_key === itemKey);
    if (idx < 0) return prev;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= typeItems.length) return prev;
    // Swap positions in array
    [typeItems[idx], typeItems[swapIdx]] = [typeItems[swapIdx], typeItems[idx]];
    // Reassign sequential display_order
    typeItems.forEach((item, i) => { typeItems[i] = { ...item, display_order: i }; });
    const otherItems = items.filter(i => i.item_type !== type);
    return { ...prev, [activeTab]: [...otherItems, ...typeItems].sort((a, b) => {
      if (a.item_type !== b.item_type) return a.item_type === 'kpi' ? -1 : 1;
      return a.display_order - b.display_order;
    }) };
  });
  markTabModified(activeTab);
}, [activeTab, markTabModified, setLocalItems]);
```

Même correction pour `moveTab` dans `TabManager.tsx` (même pattern de swap fragile).

## Fichiers modifiés

- `src/components/admin/AdminAnalyticsChartsConfig.tsx` — `moveItem` : réindexation séquentielle
- `src/components/admin/analytics-config/TabManager.tsx` — `moveTab` : même correction

