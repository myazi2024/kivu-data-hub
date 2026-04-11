

# Audit detaille — Config Graphiques (alignement, bugs, optimisations)

## 1. Desalignement blocs analytics ↔ Config admin

### BUG CRITIQUE : `useBlockFilter` non adopte (12/13 blocs)

Seul `OwnershipHistoryBlock` utilise le nouveau hook `useBlockFilter`. Les 12 autres blocs (TitleRequests, Contributions, Expertise, Mutations, Mortgages, Subdivision, Disputes, Certificates, Invoices, Taxes, BuildingPermits, Parcels) utilisent encore l'ancien pattern :
- `useState(defaultFilter)` + 4x `useContext` + `useEffect` sync manuellement
- `useTabChartsConfig(TAB_KEY, defaultItems)` + `useTabFilterConfig(TAB_KEY)` directement
- `applyFilters(data.xxx, filter)` sans passer `filterConfig.dateField`

**Impact** : Le champ date configurable par l'admin (`dateField`) est ignore dans 12 blocs — le filtrage temporel ne fonctionne pas selon la config admin.

### BUG : `useTabCrossConfig` jamais utilise

Le hook `useTabCrossConfig` (ligne 258 de `useAnalyticsChartsConfig.ts`) est exporte mais jamais importe nulle part. Tous les blocs utilisent `getCrossVariables()` directement — qui retourne les defauts du registre sans appliquer les overrides DB de l'admin.

**Impact** : Les modifications de croisements faites par l'admin dans Config Graphiques (mode Croisements) ne sont jamais appliquees cote Analytics. L'admin configure, sauvegarde, mais rien ne change dans le rendu.

### `require()` dans un hook React

`useAnalyticsTabsConfig` (ligne 114) utilise `require('@/config/analyticsTabsRegistry')` au lieu d'un import ES. Cela contourne le tree-shaking et cree un pattern non-standard dans un codebase ES modules.

---

## 2. Erreurs de logique

| Probleme | Localisation | Detail |
|----------|-------------|--------|
| `isChartsViewTab` logique confuse | `useInitializedConfig.ts:9` | `!EXCLUDED.includes(key) \|\| key === '_global'` — la condition OR est tautologique car `_global` est dans EXCLUDED. Devrait etre : `!EXCLUDED.includes(key) \|\| CHARTS_ONLY_TABS.includes(key)` pour inclure `_global` et `rdc-map` dans la vue Charts |
| `handleReset` ne restaure pas les filtres ni les croisements | `AdminAnalyticsChartsConfig.tsx:168` | Reset ne remet que `localItems`, pas les filtres ou croisements de l'onglet actif |
| FilterManager `handleSave` sauvegarde tous les onglets | `FilterManager.tsx:59` | `Object.values(localFilters).flat()` envoie les filtres de TOUS les onglets meme si un seul a ete modifie — pas un bug mais un risque de surcharge inutile |
| `applyFilters` ignore `dateField` dans les anciens blocs | 12 blocs | `applyFilters(data.xxx, filter)` est appele sans le 3e argument `dateField` — le filtre temporel utilise toujours `created_at` par defaut |

---

## 3. Redundances

| Redundance | Lignes concernees |
|-----------|------------------|
| Boilerplate filtre duplique dans 12 blocs | ~15 lignes x 12 = ~180 lignes (useState, useContext x4, useEffect, buildFilterLabel, useTabChartsConfig, useTabFilterConfig) |
| `CHART_TYPE_OPTIONS` defini 2 fois | `AdminAnalyticsChartsConfig.tsx:37-43` ET `ItemEditor.tsx:12-18` — definitions identiques |
| `defaultItems` calcule a l'identique dans chaque bloc | `[...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts]` repete 12 fois au top-level |
| Pattern `cx = (key) => getCrossVariables(TAB_KEY, key)` | Repete dans 13 blocs — devrait etre fourni par `useBlockFilter` |
| Logique de sauvegarde cross dupliquee | `handleSaveAll` (L147) et inline `onClick` (L520-530) — meme code |

---

## 4. Fonctionnalites absentes

| Fonctionnalite | Impact |
|---------------|--------|
| **Aucune preview live** : l'admin ne voit pas l'effet de ses changements (type de chart, couleur, visibilite) sans naviguer vers Analytics | UX degradee |
| **Pas de col_span configurable** : le champ `col_span` existe dans le type mais aucun editeur dans l'admin ne permet de le modifier | Fonctionnalite incomplete |
| **Pas de custom_icon configurable** : idem pour `custom_icon` sur les KPIs — le champ existe mais pas d'UI | Fonctionnalite incomplete |
| **Pas d'export/import de config** : impossible de sauvegarder une config, la partager ou la restaurer | Manque operationnel |
| **Pas d'indicateur "modifie" par filtre** : dans FilterManager, on ne sait pas quels onglets ont des filtres personnalises vs defaut | UX |
| **Pas de validation des champs cross-variables** : `field` accepte n'importe quel texte libre sans verifier si le champ existe dans la table cible | Erreurs silencieuses |

---

## 5. Plan d'implementation

### Phase 1 — Corrections critiques (bugs fonctionnels)

1. **Migrer les 12 blocs restants vers `useBlockFilter`** : Remplacer le boilerplate (useState/useContext/useEffect/useTabChartsConfig/useTabFilterConfig) par `useBlockFilter(TAB_KEY, data.xxx)` dans chaque bloc. Cela corrige aussi le bug du `dateField` ignore.

2. **Integrer `useTabCrossConfig` dans les blocs** : Remplacer `getCrossVariables(TAB_KEY, key)` par un appel qui prend en compte les overrides DB. Ajouter `getCrossVariablesWithOverrides` dans `useBlockFilter` ou creer un helper `cx` qui utilise les configs admin.

3. **Supprimer `CHART_TYPE_OPTIONS` duplique** : Extraire dans un fichier partage et importer dans les deux composants.

4. **Corriger `isChartsViewTab`** : Remplacer la logique confuse par une condition claire.

5. **Remplacer `require()` par un import ES** dans `useAnalyticsTabsConfig`.

### Phase 2 — Optimisations

6. **Ajouter `col_span` dans ItemEditor** : Slider ou select (1-3) pour les charts uniquement.

7. **Ajouter indicateur "personnalise" dans FilterManager** : Badge visuel sur les onglets dont la config differe du defaut.

### Section technique

**Fichiers a modifier** :
- 12 fichiers dans `src/components/visualizations/blocks/` — migration `useBlockFilter`
- `src/hooks/useBlockFilter.ts` — ajouter support cross-variables
- `src/hooks/useAnalyticsChartsConfig.ts` — supprimer `require()`, corriger `isChartsViewTab`
- `src/hooks/useInitializedConfig.ts` — corriger `isChartsViewTab`
- `src/components/admin/AdminAnalyticsChartsConfig.tsx` — supprimer `CHART_TYPE_OPTIONS` duplique
- `src/components/admin/analytics-config/ItemEditor.tsx` — ajouter `col_span` editor

**Risque** : La migration des blocs est un refactoring mecanique avec test de non-regression sur le filtrage temporel. La correction du cross-variables est la plus impactante car elle active enfin la fonctionnalite admin dans le rendu.

**Estimation** : ~250 lignes supprimees (deduplication), ~50 lignes ajoutees (col_span + corrections).

