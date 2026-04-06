

# Audit détaillé — Page « Données foncières » (/map)

## 1. Code mort / Redondances

| Problème | Fichier | Détail |
|----------|---------|--------|
| **`countForProvince` et `sumForProvince` inutilisées après refacto** | `DRCInteractiveMap.tsx` L49-58 | Ces fonctions sont encore utilisées dans `provincesData` (L130-137) pour construire les données choroplèthes par province, donc elles ne sont PAS mortes. Mais leur logique est dupliquée avec `buildScopePredicate` — la même logique de filtrage existe en deux implémentations. |
| **Double appel `useLandDataAnalytics`** | `ProvinceDataVisualization.tsx` reçoit `analytics` en prop, mais chaque bloc enfant via `AnalyticsFilters` refiltre `data.*` — le hook n'est appelé qu'une fois dans `DRCInteractiveMap`, c'est correct. | Pas de bug, mais les 14 blocs recalculent chacun `applyFilters` indépendamment sur le même dataset. |
| **Import `useCallback` inutilisé** dans 4 blocs | `TitleRequestsBlock`, `ContributionsBlock`, `SubdivisionBlock`, `OwnershipHistoryBlock`, `MutationBlock` | `useCallback` est importé mais jamais utilisé. |

## 2. Logique — Bugs et incohérences

| Problème | Impact | Sévérité |
|----------|--------|----------|
| **`matchesLocation` ne normalise pas les chaînes** | `analyticsHelpers.ts` L62-71 : comparaison stricte `r.province !== f.province` sans `trim()`/`toLowerCase()`. Si les données DB ont des espaces ou casses différentes, le filtre ne matche pas. `buildScopePredicate` dans `DRCInteractiveMap` normalise, mais `applyFilters` (utilisé par les 14 blocs) ne le fait pas. | **Élevée** — incohérence entre le bloc résumé (qui normalise) et les 14 blocs analytics (qui ne normalisent pas). |
| **Densité calculée sur un seuil absolu de parcelles** | L161, L242 : `pCount > 500 → Très élevé`. Ce calcul n'a pas de rapport avec la densité (parcelles/ha). Il faudrait diviser par la surface ou utiliser un ratio. | **Moyenne** — indicateur trompeur. |
| **`scopedStats` filtrage `quartier` incomplet** | `buildScopePredicate` L70 : quand un quartier est sélectionné, le prédicat vérifie `quartier + commune` mais pas `ville` ni `province`. Si deux communes dans deux villes différentes ont un quartier du même nom, les résultats seraient mélangés. | **Moyenne** — peu probable en pratique, mais logiquement faux. |
| **Carte Communes/Quartiers sans callback vers le parent** | `DRCCommunesMap` et `DRCQuartiersMap` ne remontent pas les clics (pas de `onCommuneSelect` / `onQuartierSelect`). La sélection commune/quartier ne vient que des filtres Analytics, jamais d'un clic sur la carte. | **Élevée** — UX attendue mais absente : cliquer sur une commune/quartier sur la carte devrait filtrer les données. |
| **Filtre année par défaut = année courante** | `defaultFilter.year = new Date().getFullYear()` (2026). Si la majorité des données sont antérieures, l'utilisateur voit 0 partout au premier chargement. Pas d'option "Toutes les années". | **Moyenne** — UX trompeuse. |
| **`SubdivisionBlock` `revenueTrend` utilise `sumByMonth(filtered)` sans filtre payment** | Contrairement aux autres blocs qui filtrent `r.payment_status === 'paid'` avant `sumByMonth`, ici TOUS les enregistrements sont sommés, y compris les non payés. | **Faible** — incohérence de calcul. |

## 3. Données fictives / Indicateurs fictifs

| Élément | Statut |
|---------|--------|
| **Aucune donnée fictive hardcodée** dans les 14 blocs | Les blocs consomment uniquement des données Supabase réelles. |
| **`PROVINCE_META` (26 provinces)** | Données géographiques légitimes de la RDC. |
| **Seuils de densité choroplèthe (30/100/500)** | Arbitraires mais pas fictifs — ce sont des paliers configurables. |
| **`buildEmptyProvince`** | Retourne des zéros, utilisé uniquement en loading state — correct. |

Conclusion : pas de données fictives détectées.

## 4. Fonctionnalités absentes

| Fonctionnalité | Détail |
|----------------|--------|
| **Clic sur carte Communes → filtre commune** | `DRCCommunesMap` affiche les communes mais un clic ne propage rien vers les filtres/analytics. |
| **Clic sur carte Quartiers → filtre quartier** | Idem pour `DRCQuartiersMap`. |
| **Export des données / graphiques** | Aucun bouton d'export CSV/PDF sur les blocs analytics. Seule la copie image de la carte existe. |
| **État vide informatif par bloc** | Quand un bloc retourne 0 résultats (pas de données pour le filtre actif), il affiche des graphiques vides sans message explicatif. |
| **Filtre "Toutes les années"** | Le sélecteur d'année n'offre pas d'option pour voir l'ensemble de l'historique. |
| **Indicateur de nombre total en header d'onglet** | Les onglets (Titres, Parcelles, etc.) n'affichent pas le count filtré à côté du label — l'utilisateur ne sait pas combien de records contient chaque onglet sans cliquer. |
| **Carte sous-niveau pour d'autres villes que Goma** | Seule Goma a un GeoJSON quartiers. Les autres villes n'affichent que les communes. Pas un bug mais une limitation à documenter. |
| **Persistance du filtre géographique** | Quand on change d'onglet analytics (ex: Titres → Parcelles), le filtre année est réinitialisé car chaque bloc a son propre `useState(defaultFilter)`. La province/ville/commune/quartier sont resynchronisés via contexte, mais année/semestre/trimestre/mois/statut sont perdus. |

## 5. Optimisations recommandées

| Optimisation | Détail |
|--------------|--------|
| **Normaliser `matchesLocation`** | Aligner avec `buildScopePredicate` : ajouter `trim().toLowerCase()` dans `analyticsHelpers.ts` pour éviter les faux négatifs. |
| **`buildScopePredicate` : ajouter tous les niveaux** | Vérifier `province + ville + commune + quartier` ensemble, pas seulement les deux derniers niveaux. |
| **Fusionner `countForProvince`/`sumForProvince` avec `buildScopePredicate`** | Éliminer la duplication en utilisant `buildScopePredicate` aussi pour `provincesData`. |
| **`LandAnalyticsData` : typer au lieu de `any[]`** | Les 14 datasets sont typés `any[]`. Créer des interfaces dédiées pour chaque table (au moins les champs utilisés). |
| **Lazy loading des blocs** | Les 14 blocs sont tous importés statiquement. Seul le bloc actif est rendu (via `BLOCK_MAP[activeTab]`), mais ils sont tous dans le bundle. Utiliser `React.lazy()`. |
| **Mémoiser `enrichByParcelNumber` / `enrichFraud`** | Dans `useLandDataAnalytics`, la boucle `contribs.find()` dans `enrichFraud` est O(n×m). Créer un Map `contributionById` pour O(1). |
| **Pagination côté client** | `GeoCharts` affiche tous les quartiers/avenues sans pagination. Si une province a 200 quartiers, le graphique est illisible. Ajouter un `maxItems` ou top-N. |

## 6. Visuels

| Problème | Détail |
|----------|--------|
| **Légende choroplèthe et légende contextuelle se chevauchent** | Les deux sont en `absolute bottom-5 left-2`. Quand une province est sélectionnée et qu'on n'est pas zoomé, les deux s'affichent (la choroplèthe ne se masque que si `isMapZoomed` ou `selectedVille`). |
| **Tooltip carte Communes/Quartiers minimal** | N'affiche que le nom + ville. Aucune donnée cadastrale (parcelles, revenus) dans le tooltip, contrairement à la carte provinces. |
| **Mobile : bouton Carte/Analytics masque les détails province** | Le basculeur mobile n'a que 2 états (Carte / Analytics). Le bloc "Données géographiques" sous la carte est masqué en mode Analytics, ce qui force l'utilisateur à basculer pour voir le résumé. |

## Résumé des actions prioritaires

1. **Critique** : Rendre les cartes Communes/Quartiers cliquables (propagation du filtre)
2. **Critique** : Normaliser les comparaisons de chaînes dans `matchesLocation` (analyticsHelpers)
3. **Élevée** : Compléter `buildScopePredicate` pour vérifier toute la hiérarchie géographique
4. **Moyenne** : Ajouter l'option "Toutes les années" au filtre temporel
5. **Moyenne** : Corriger le calcul de densité (ratio parcelles/surface)
6. **Faible** : Nettoyer les imports `useCallback` inutilisés
7. **Faible** : Typer `LandAnalyticsData` avec des interfaces au lieu de `any[]`

