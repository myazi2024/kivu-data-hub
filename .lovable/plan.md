

# Audit — Menu "Données foncières" (/map)

## Architecture

```text
┌────────────────────────────────┐
│ /map (Map.tsx)                 │
│  └─ DRCInteractiveMap          │
│      ├─ Carte SVG (DRCMapWithTooltip) │
│      ├─ Panneau détails province      │
│      └─ ProvinceDataVisualization     │
│           ├─ Onglets (11 blocks)      │
│           ├─ AnalyticsFilters         │
│           └─ useTabChartsConfig       │
└────────────────────────────────┘
         ↕ données
┌────────────────────────────────┐
│ useLandDataAnalytics           │
│ (14 tables Supabase, fetchAll) │
└────────────────────────────────┘
         ↕ config
┌────────────────────────────────┐
│ useAnalyticsChartsConfig       │
│ (analytics_charts_config table)│
│ ANALYTICS_TABS_REGISTRY (14 tabs) │
└────────────────────────────────┘
```

---

## Problemes identifies

### 1. CRITIQUE — 3 onglets registrés sans composant Block

Le `ANALYTICS_TABS_REGISTRY` declare 14 onglets (hors `_global` et `rdc-map`), mais le `BLOCK_MAP` dans `ProvinceDataVisualization.tsx` n'en mappe que 11. Trois onglets n'ont pas de composant :

| Tab key | Label | Block existant ? |
|---|---|---|
| `mortgages` | Hypotheques | Non |
| `building-permits` | Autorisations | Non |
| `taxes` | Taxes foncieres | Non |

**Impact** : Si un admin rend ces onglets visibles, cliquer dessus affiche un panneau vide (`BlockComponent` sera `undefined`, le rendu sera `null`). Les donnees sont pourtant deja fetchees par `useLandDataAnalytics` (`buildingPermits`, `taxHistory`, `mortgages`).

### 2. MOYEN — Prop `provinces` declaree mais jamais utilisee

`ProvinceDataVisualization` accepte une prop `provinces: ProvinceData[]` mais ne l'utilise nulle part dans le composant. Le composant re-fetche ses propres donnees via `useLandDataAnalytics()`, ce qui cree un **double fetch** : une fois dans `DRCInteractiveMap` et une fois dans `ProvinceDataVisualization`.

**Impact** : Deux appels identiques a `useLandDataAnalytics` (14 tables). Grace a React Query et la meme `queryKey`, le deuxieme est servi du cache, donc pas de requete reseau supplementaire. Mais le code est trompeur et la prop est inutile.

### 3. MOYEN — Typage `any[]` partout dans les donnees analytics

`LandAnalyticsData` declare toutes ses proprietes comme `any[]`. Les 11 blocks travaillent avec des `any` sans aucune verification de type. La fonction `fetchAll` utilise `(supabase.from as any)(table)` pour contourner le typage.

**Impact** : Aucune protection contre les changements de schema. Si une colonne est renommee ou supprimee, le code echoue silencieusement (valeurs `undefined` dans les graphiques).

### 4. MOYEN — Donnees chargees mais pas exploitees dans les blocs

`useLandDataAnalytics` fetche `buildingPermits` et `taxHistory` comme entites a part entiere, mais elles ne sont consommees que de maniere secondaire dans `ParcelsWithTitleBlock` (comme sous-donnees de parcelles). Il n'y a pas de bloc dedie pour analyser ces donnees independamment, malgre la config complete dans le registry.

### 5. MOYEN — Performance : `countForProvince` est O(n) par province

Dans `DRCInteractiveMap`, la construction de `provincesData` appelle `countForProvince` (filtre lineaire) pour chaque type de donnee x 26 provinces. Pour 7 compteurs, cela fait 182 passes lineaires sur les tableaux. Avec des volumes importants, cela peut ralentir le rendu.

**Impact** : Negligeable avec peu de donnees, mais degrade avec la croissance.

### 6. MINEUR — Double instanciation de `useLandDataAnalytics`

Le hook est appele dans `DRCInteractiveMap` (ligne 74) ET dans `ProvinceDataVisualization` (ligne 61). React Query deduplique les requetes, mais c'est du code redondant. Les donnees de la carte pourraient etre passees en prop.

### 7. MINEUR — Pas de gestion d'erreur visible pour l'utilisateur

Si `useLandDataAnalytics` echoue, `DRCInteractiveMap` ne montre aucun message d'erreur — il affiche simplement les provinces avec 0 partout (via `buildEmptyProvince`). L'erreur n'est geree que dans `ProvinceDataVisualization` (message texte discret).

### 8. MINEUR — `html2canvas` importe en entier pour un seul bouton

La dependance `html2canvas` (~400 KB) est importee statiquement en haut de `DRCInteractiveMap.tsx` pour le bouton "Copier en image", utilise rarement.

**Impact** : Augmente le bundle initial.

---

## Recommandations

### Corrections prioritaires

1. **Creer les 3 blocs manquants** (`MortgagesBlock`, `BuildingPermitsBlock`, `TaxesBlock`) et les ajouter au `BLOCK_MAP` et `ICON_MAP` dans `ProvinceDataVisualization.tsx`. Les donnees sont deja fetchees — il suffit de creer les composants de visualisation.

2. **Supprimer la prop `provinces` inutilisee** de `ProvinceDataVisualization` et l'appel correspondant dans `DRCInteractiveMap` pour eviter la confusion.

3. **Passer les donnees analytics en prop** au lieu du double hook, pour eliminer la redondance.

### Ameliorations

4. **Pre-indexer les compteurs par province** avec un `Map<string, number>` en une seule passe au lieu de 182 filtres lineaires.

5. **Lazy-importer `html2canvas`** : `const html2canvas = (await import('html2canvas')).default` dans le handler `handleCopyImage`.

6. **Ajouter un etat d'erreur** dans `DRCInteractiveMap` quand le fetch echoue.

7. **Typer les entites analytics** au lieu de `any[]` pour beneficier de la verification TypeScript.

