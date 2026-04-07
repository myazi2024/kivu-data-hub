

# Audit — Config Graphiques (Admin Analytics)

## A. Graphiques enregistrés dans le registre mais NON rendus dans les blocs

Le registre `ANALYTICS_TABS_REGISTRY` déclare des `item_key` que l'admin affiche et permet de configurer, mais qui ne sont **jamais utilisés** par le bloc correspondant (pas de `v('key')` dans le JSX). L'admin donne l'illusion que ces graphiques existent.

| # | Onglet | `item_key` dans registre | Rendu dans bloc ? | Impact |
|---|--------|--------------------------|-------------------|--------|
| 1 | `taxes` | `tax-type` | NON | Le registre déclare un graphique "Type de taxe" mais `TaxesBlock` ne contient aucun `v('tax-type')`. Le toggle admin est **fictif**. |
| 2 | `taxes` | `fiscal-zone` | NON | "Zone fiscale" déclaré mais jamais rendu. Toggle fictif. |
| 3 | `taxes` | `penalties` | NON | "Avec/sans pénalités" déclaré mais jamais rendu. |
| 4 | `taxes` | `exemptions` | NON | "Exonérations" déclaré mais jamais rendu. |
| 5 | `taxes` | `province` | NON | "Par province" déclaré mais jamais rendu (le bloc utilise `GeoCharts` via `v('geo')` qui est un composant distinct). |
| 6 | `building-permits` | `estimated-cost` | A vérifier | Déclaré dans registre mais potentiellement pas rendu. |
| 7 | `building-permits` | `roofing-type` | A vérifier | Idem. |
| 8 | `building-permits` | `water-supply` | A vérifier | Idem. |
| 9 | `building-permits` | `electricity` | A vérifier | Idem. |

## B. Variables croisées manquantes dans `crossVariables.ts`

Les graphiques suivants sont dans le registre et rendus dans les blocs, mais n'ont **aucune entrée** dans `CROSS_VARIABLE_REGISTRY`, empêchant tout croisement :

| # | Onglet | `item_key` | Cross-variables ? |
|---|--------|------------|-------------------|
| 10 | `taxes` | `tax-type` | NON (même le graphique n'est pas rendu — cf. point 1) |
| 11 | `taxes` | `fiscal-zone` | NON |
| 12 | `taxes` | `penalties` | NON |
| 13 | `taxes` | `exemptions` | NON |
| 14 | `mortgages` | `request-type` | NON — déclaré "Enreg. vs Radiation" mais absent de `crossVariables.ts` |
| 15 | `mortgages` | `request-status` | NON — "Statut demandes" absent |
| 16 | `building-permits` | `estimated-cost` | NON |
| 17 | `building-permits` | `roofing-type` | NON |
| 18 | `building-permits` | `water-supply` | NON |
| 19 | `building-permits` | `electricity` | NON |
| 20 | `building-permits` | `payment` | NON |

## C. Incohérences logiques entre registre et blocs

| # | Problème |
|---|----------|
| 21 | **`display_order` dupliqué** dans `title-requests` : `construction-materials` et `revenue-trend` ont tous les deux `display_order: 13`. `standing` et `processing-comparison` ont tous les deux `display_order: 14`. Cela rend l'ordre non déterministe dans l'admin. |
| 22 | **Mode Filtres : `_global` et `rdc-map` absents** — `TAB_FILTER_DEFAULTS` ne contient pas d'entrée pour `_global` ni `rdc-map`, donc ces onglets n'apparaissent pas dans le mode Filtres. Cohérent mais pas documenté. |
| 23 | **Mode Croisements : l'admin n'affiche pas les onglets sans cross-variables** — `_global`, `rdc-map` et `invoices` n'apparaissent pas dans la liste des onglets croisables si on y est mais n'ont pas de graphique croisable. `invoices` a des entrées mais elles ne couvrent pas tous les graphiques. |
| 24 | **Bouton "Sauvegarder filtres" dans FilterManager est indépendant** — Le mode Filtres a son propre bouton "Sauvegarder filtres" (ligne 331) qui sauvegarde uniquement les filtres. Mais le bouton global "Sauvegarder tout" (ligne 1001) sauvegarde aussi les filtres. Pas d'incohérence fonctionnelle mais la duplication peut prêter à confusion. |
| 25 | **`handleSave` ne sauvegarde qu'un onglet** (ligne 819-832) — En mode Graphiques, le bouton "Sauvegarder" ne sauvegarde que l'onglet actif (`activeTab`). Si l'admin modifie 3 onglets et clique "Sauvegarder" (pas "Sauvegarder tout"), seul l'onglet visible est persisté. Le comportement est correct mais le badge "modifié" sur les autres onglets reste, ce qui peut être déroutant. |

## D. Fonctionnalités absentes

| # | Fonctionnalité |
|---|----------------|
| 26 | **Pas de prévisualisation** — L'admin ne peut pas voir le résultat de ses modifications sans quitter la page pour aller dans "Données foncières". Un aperçu inline serait utile. |
| 27 | **Pas de recherche/filtre dans la liste des graphiques** — Certains onglets ont 15+ items. Aucun champ de recherche pour trouver rapidement un graphique. |
| 28 | **Pas d'export/import de configuration** — L'admin ne peut pas sauvegarder une snapshot de configuration pour la restaurer ultérieurement. La seule option est "Réinitialiser" qui revient aux defaults hardcodés. |
| 29 | **Pas de validation des champs `field` dans les croisements** — L'admin peut taper n'importe quel nom de champ dans l'input `field_name` des croisements. Aucune validation que le champ existe réellement dans les données. Un sélecteur de champs connus serait plus sûr. |
| 30 | **Pas de compteur global** — L'admin ne voit pas le total de graphiques/KPI/croisements configurés sur l'ensemble du système. Un résumé serait utile dans l'en-tête. |

## E. Optimisations

| # | Proposition |
|---|-------------|
| 31 | **Corriger les `display_order` dupliqués** dans `title-requests` (points 21). Réindexer séquentiellement. |
| 32 | **Supprimer les entrées fictives du registre** — Retirer les `item_key` qui ne sont pas rendus dans les blocs (points 1-5), ou les implémenter dans les blocs correspondants. |
| 33 | **Ajouter les cross-variables manquantes** pour les graphiques rendus qui n'en ont pas (points 14-20). |

---

## Plan de corrections

### Priorité 1 — Supprimer les graphiques fictifs du registre

**Fichier** : `src/hooks/useAnalyticsChartsConfig.ts`
- Retirer de `taxes.charts` : `tax-type`, `fiscal-zone`, `penalties`, `exemptions`, `province` (5 entrées) — ces graphiques ne sont pas rendus dans `TaxesBlock`
- OU implémenter ces 5 graphiques dans `TaxesBlock.tsx` (si les données existent)

### Priorité 2 — Corriger les `display_order` dupliqués

**Fichier** : `src/hooks/useAnalyticsChartsConfig.ts`
- `title-requests.charts` : réindexer `construction-materials` (13), `standing` (14), `revenue-trend` (15), `processing-comparison` (16), `geo` (17), `evolution` (18)

### Priorité 3 — Ajouter les cross-variables manquantes

**Fichier** : `src/config/crossVariables.ts`
- `mortgages` : ajouter `request-type` et `request-status`
- `building-permits` : ajouter `estimated-cost`, `roofing-type`, `water-supply`, `electricity`, `payment`
- `taxes` : ajouter les entrées si les graphiques correspondants sont implémentés

### Priorité 4 — Vérifier l'alignement `BuildingPermitsBlock`

**Fichier** : `src/components/visualizations/blocks/BuildingPermitsBlock.tsx`
- Vérifier que les 12 graphiques déclarés dans le registre sont bien tous rendus avec `v('key')`
- Supprimer du registre ceux qui ne sont pas rendus, ou les implémenter

**Impact total** : ~30 lignes modifiées dans 3 fichiers.

