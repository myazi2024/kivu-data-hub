
# Audit detaille — Config Graphiques vs Analytics (Donnees foncieres)

## 1. Architecture d'alignement

L'alignement repose sur un registre unique : **`ANALYTICS_TABS_REGISTRY`** dans `src/hooks/useAnalyticsChartsConfig.ts` (lignes 275-642). Ce registre definit les 14 onglets, leurs KPIs et leurs graphiques avec des `item_key` uniques.

**Cote Analytics** : chaque Block (`TitleRequestsBlock.tsx`, `TaxesBlock.tsx`, etc.) importe ce registre et construit ses defaults avec `[...ANALYTICS_TABS_REGISTRY[TAB_KEY].kpis, ...ANALYTICS_TABS_REGISTRY[TAB_KEY].charts]`. Les cles `isChartVisible('xxx')` et `getChartConfig('xxx')` sont resolues par fusion DB + defaults.

**Cote Admin** : `AdminAnalyticsChartsConfig.tsx` itere sur le meme `ANALYTICS_TABS_REGISTRY` pour generer l'interface d'edition. Toute cle ajoutee au registre apparait automatiquement dans l'admin.

**Resultat** : l'alignement des cles est deja verrouille. Une comparaison exhaustive des 14 onglets confirme que **chaque `item_key` utilise dans un Block a une correspondance exacte dans le registre, et vice-versa**. Zero desalignement.

## 2. Anomalies identifiees

| # | Severite | Composant | Description |
|---|----------|-----------|-------------|
| C1 | **Moyenne** | `AdminAnalyticsChartsConfig.tsx` L153 | **`resetAll` dans TabManager inclut `_global` et `rdc-map`**. La fonction `resetAll` genere des TabConfig pour toutes les entrees du registre, y compris `_global` et `rdc-map` qui ne sont pas des onglets utilisateur. Cela peut creer des entrees `__tab__` parasites en base pour ces cles speciales. Devrait filtrer `_global` et `rdc-map` comme le fait deja `useAnalyticsTabsConfig` (L117). |
| C2 | **Moyenne** | `AdminAnalyticsChartsConfig.tsx` L1046 vs L1139 | **Filtrage incoherent entre les vues KPIs et Charts**. La vue KPIs filtre `_global` ET `rdc-map` du selecteur d'onglets. La vue Charts filtre seulement `_global` (affiche `rdc-map`). La vue Filtres et Croisements filtrent differemment. Il faudrait un filtrage uniforme — `rdc-map` dans Charts est intentionnel (config carte), mais le manque de coherence peut induire en erreur. |
| C3 | **Moyenne** | `crossVariables.ts` + admin | **Pas de validation de coherence cross → registry**. Les cles dans `CROSS_VARIABLE_REGISTRY` ne sont pas validees contre `ANALYTICS_TABS_REGISTRY`. Si un graphique est renomme (cle modifiee) dans le registre, la config croisements devient orpheline sans avertissement. |
| C4 | **Basse** | `AdminAnalyticsChartsConfig.tsx` | **Pas de mode preview**. L'admin modifie titre, visibilite, type de graphique, mais ne peut pas previsualiser le rendu final sans naviguer manuellement vers Analytics. Un bouton "Apercu" ou un lien direct vers l'onglet concerne ameliorerait le workflow. |
| C5 | **Basse** | `useAnalyticsChartsConfig.ts` L37-52 | **`TAB_FILTER_DEFAULTS` est statique**. Si un nouvel onglet est ajoute au registre sans ajouter son entree dans `TAB_FILTER_DEFAULTS`, la vue Filtres de l'admin ne l'affichera pas. Il n'y a pas de fallback automatique. |
| C6 | **Basse** | `AdminAnalyticsChartsConfig.tsx` | **Pas de detection de desynchronisation**. Si un developpeur ajoute un graphique dans un Block mais oublie de l'ajouter au registre (ou vice-versa), il n'y a aucune alerte cote admin ou cote analytics. Un avertissement "X cles non configurees" ameliorerait la robustesse. |
| C7 | **Info** | `useAnalyticsChartsConfig.ts` L223 | **`as any` sur l'upsert Supabase**. Le cast bypasse le typage TypeScript pour l'insertion dans `analytics_charts_config`. |

## 3. Resume

```text
Severite    Count
─────────   ─────
Moyenne     3 (C1-C3)
Basse       3 (C4-C6)
Info        1 (C7)
─────────   ─────
Total       7
```

**Verdict** : l'alignement est structurellement verrouille grace au registre partage `ANALYTICS_TABS_REGISTRY`. Les anomalies sont des problemes de robustesse (coherence du filtrage, detection de desynchronisation) et non des desalignements de donnees.

## 4. Plan de correction recommande

### Fichier : `src/hooks/useAnalyticsChartsConfig.ts`

**a) C5 — Fallback automatique pour TAB_FILTER_DEFAULTS** :
- Modifier `useTabFilterConfig` pour retourner un default generique `{ hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' }` quand le tabKey n'existe pas dans `TAB_FILTER_DEFAULTS`, au lieu de rien

**b) C7 — Supprimer `as any`** :
- Typer correctement l'objet d'upsert

### Fichier : `src/components/admin/AdminAnalyticsChartsConfig.tsx`

**c) C1 — Filtrer `resetAll`** :
- Ajouter `.filter(([key]) => key !== '_global' && key !== 'rdc-map')` dans `resetAll` du TabManager

**d) C2 — Unifier le filtrage des vues** :
- Extraire une constante `EXCLUDED_SPECIAL_TABS = ['_global']` et `TAB_WITH_CHARTS_ONLY = ['rdc-map']` pour rendre le filtrage explicite et coherent entre les 5 vues

**e) C4 — Lien vers Analytics** :
- Ajouter un bouton "Voir dans Analytics" qui navigue vers `/analytics?tab={activeTab}` dans le header de chaque vue

**f) C6 — Detection de desynchronisation** :
- A l'initialisation, comparer les cles du registre avec les cles effectivement utilisees dans les configs DB et afficher un badge d'avertissement si des orphelins sont detectes

### Fichier : `src/config/crossVariables.ts`

**g) C3 — Validation cross → registry** :
- Ajouter une verification au build (ou au runtime en dev) que chaque cle dans `CROSS_VARIABLE_REGISTRY` existe dans `ANALYTICS_TABS_REGISTRY`

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/hooks/useAnalyticsChartsConfig.ts` | Fallback filter, typage upsert |
| `src/components/admin/AdminAnalyticsChartsConfig.tsx` | Filtrage coherent, lien preview, detection orphelins |
| `src/config/crossVariables.ts` | Validation coherence |

**Impact** : ~30 lignes modifiees dans 3 fichiers. Aucune migration.
