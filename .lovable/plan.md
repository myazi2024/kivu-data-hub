

## Préfixer les titres des visuels avec le nom de l'onglet

### Approche
Centraliser dans `useBlockFilter.ts` (utilisé par les 13 blocks). Modifier la fonction `ct(key, fallback)` pour préfixer automatiquement le résultat (custom_title ou fallback) avec le label de l'onglet.

### Modification

**`src/hooks/useBlockFilter.ts`**
- Récupérer `ANALYTICS_TABS_REGISTRY[tabKey].label` (ex. "Titres fonciers", "Mutations", "Hypothèques", etc.).
- Modifier `ct` :
  ```ts
  const tabLabel = ANALYTICS_TABS_REGISTRY[tabKey]?.label;
  const ct = (key: string, fallback: string) => {
    const base = getChartConfig(key)?.custom_title || fallback;
    // Ne pas préfixer les KPI (clés commençant par 'kpi-')
    if (!tabLabel || key.startsWith('kpi-')) return base;
    // Éviter double préfixe si déjà présent
    if (base.startsWith(`${tabLabel} : `)) return base;
    return `${tabLabel} : ${base}`;
  };
  ```

### Détails
- **KPI exclus** : les KPI (`kpi-total`, `kpi-active`, etc.) restent courts car affichés en grille compacte. Seuls les titres des graphiques (ChartCard) sont préfixés.
- **Idempotent** : si un admin a déjà saisi un titre incluant le préfixe via la config DB, pas de duplication.
- **Aucun changement** dans les 13 blocks ni dans `ChartCard`.

### Résultat
Dans l'onglet "Titres fonciers", les visuels deviennent :
- "Titres fonciers : Type de titre"
- "Titres fonciers : Type de bail"
- "Titres fonciers : Statut juridique"
- etc.

Idem pour tous les autres onglets (Mutations, Hypothèques, Litiges, Autorisations, etc.) avec leur label respectif issu du registre `ANALYTICS_TABS_REGISTRY`.

