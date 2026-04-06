
# Audit détaillé — Config Graphiques (Admin)

## Architecture actuelle

La page est structurée en 3 modes : **Onglets** | **Graphiques** | **Filtres**, avec un registre de 16 entrées (`ANALYTICS_TABS_REGISTRY`) stockant ~150 items (KPIs + Charts) et un système de fusion defaults/DB via `useTabChartsConfig`.

---

## 1. Redondances et code mort

| Problème | Localisation | Sévérité |
|----------|-------------|----------|
| **`_global` tab** ne contient qu'un watermark (`global-watermark`). Ce n'est pas un onglet analytics réel, il ne devrait pas apparaître dans le sélecteur d'onglets du mode Graphiques ni dans le mode Filtres | `useAnalyticsChartsConfig.ts` L554-560, `AdminAnalyticsChartsConfig.tsx` L671 | Moyenne |
| **`rdc-map` dans le mode Filtres** : cet onglet carte n'a pas de filtres analytics (pas de `AnalyticsFilters`) mais apparaît dans `TAB_FILTER_DEFAULTS`… non, il n'y apparaît pas, mais il apparaît quand même dans la liste des onglets du `FilterManager` car celui-ci itère sur `Object.keys(TAB_FILTER_DEFAULTS)` — OK, il est bien exclu. **Cependant** `_global` et `rdc-map` apparaissent dans le sélecteur d'onglets du mode **Graphiques** (L671 itère `ANALYTICS_TABS_REGISTRY`) | Admin UI L671 | Faible |
| **Duplication tooltip/detail KPIs dans `rdc-map`** : 11 KPIs tooltip + 13 KPIs detail = 24 items, avec des libellés identiques (Parcelles, Titres, Contributions…). Les labels sont dupliqués entre `tooltip-*` et `detail-*` | Registry L573-598 | Faible |
| **`Pencil` importé mais jamais utilisé** dans `AdminAnalyticsChartsConfig.tsx` L18 | Import L18 | Faible |

## 2. Fonctionnalités absentes

| Fonctionnalité manquante | Impact | Priorité |
|--------------------------|--------|----------|
| **Pas de configuration du `dateField` ni `statusField` dans le mode Filtres** : l'admin peut activer/désactiver les 3 filtres (statut, temps, lieu) mais ne peut pas changer le champ date source (`created_at` vs `ownership_start_date` vs `generated_at`) ni le champ statut (`status` vs `current_status`). Ces valeurs restent hardcodées dans `TAB_FILTER_DEFAULTS` | L'admin ne peut pas adapter les champs sources si le schéma DB évolue | Élevée |
| **Pas de prévisualisation** : aucun aperçu du rendu du graphique/KPI dans la config admin. L'admin doit naviguer vers /map pour voir le résultat | UX | Moyenne |
| **Pas de recherche/filtrage** dans la liste des onglets (mode Graphiques) : avec 16 onglets, trouver un item spécifique est fastidieux | UX | Faible |
| **Pas de drag-and-drop** pour réordonner : seuls des boutons ↑↓ existent. Pour déplacer un item du rang 15 au rang 2, il faut 13 clics | UX | Faible |
| **Pas de "Réinitialiser tout"** global : le bouton reset ne fonctionne que pour l'onglet actif (L528-537). Pas de reset global qui supprimerait tous les overrides DB | UX | Moyenne |
| **Pas de confirmation avant "Sauvegarder tout"** : le bouton sauvegarde immédiatement tous les onglets + tabs sans confirmation | UX | Faible |
| **Pas d'export/import** de la configuration (JSON) pour sauvegarder/restaurer des presets | UX avancée | Faible |

## 3. Indicateurs fictifs / données non vérifiables

| Problème | Détail |
|----------|--------|
| **Registry déclare des graphiques qui pourraient ne pas exister dans les blocs** : le registry est la source de vérité pour la config admin mais la correspondance avec les `item_key` utilisés dans les blocs (ex: `v('legal-status')`) n'est pas validée à la compilation. Si un bloc utilise `v('legal-status')` mais le registry a `item_key: 'legal-statut'`, le graphique sera toujours visible (fallback `true` dans `isChartVisible`) | Aucune validation de cohérence registry ↔ blocs |
| **Graphiques "Géographie" (`geo`)** n'ont pas de `chart_type` dans le registry (ex: L252, L276) car ils sont rendus par `GeoCharts` et non par `ChartCard`. C'est correct mais confusant pour l'admin qui voit un item sans type de graphique et sans couleur | Cohérence UI |

## 4. Problèmes de logique

| Problème | Détail | Sévérité |
|----------|--------|----------|
| **Mode Filtres : `handleSave` écrase potentiellement** — le `FilterManager` sauvegarde tous les filter items de tous les onglets en un seul upsert. Si un autre admin modifie un filtre en parallèle, ses changements seront écrasés (pas de versioning/locking) | Concurrence admin | Faible |
| **`handleSaveAll` mélange charts et tabs mais pas les filtres** : le bouton "Sauvegarder tout" (L496-511) fusionne `allChartItems` + `tabItems` mais n'inclut pas les filter items du `FilterManager` (qui a son propre état local) | L'état des filtres modifiés dans le mode Filtres n'est pas pris en compte par "Sauvegarder tout" | Élevée |
| **`hasChanges` ne reflète pas les modifications des filtres** : `hasChanges = hasChartChanges \|\| hasTabChanges` (L393) mais le mode Filtres a son propre `modified` state interne. Le badge "Non sauvegardé" ne s'affiche pas quand seuls les filtres sont modifiés | Élevée |
| **Tri des items** : la logique de tri (L418-421) force les KPIs avant les charts. Si un admin veut intercaler un KPI après un chart, c'est impossible | Contrainte de design |

## 5. Incohérences entre Registry et Blocs

| Tab | Registry items | Problème potentiel |
|-----|---------------|-------------------|
| `ownership` | `dateField: 'ownership_start_date'` | Le trend dans `OwnershipHistoryBlock` utilise `trendByMonth(filtered, 'ownership_start_date')` mais `applyFilters` utilise `filterConfig.dateField` — OK si cohérent, mais si l'admin pouvait changer `dateField`, le trend continuerait d'utiliser `'ownership_start_date'` en dur |
| `certificates` | `dateField: 'generated_at'` | Idem, les blocs ont parfois des `dateField` hardcodés en plus du filterConfig |
| `disputes` | `statusField: 'current_status'` | Seul onglet avec un statusField non-default. Non configurable via l'UI admin |

## 6. Optimisations recommandées

### Priorité haute
1. **Remonter l'état des filtres** dans le composant parent pour que `hasChanges` et "Sauvegarder tout" incluent les modifications de filtres
2. **Ajouter `dateField` et `statusField` configurables** dans le mode Filtres (2 selects supplémentaires par onglet avec les champs possibles)
3. **Valider la cohérence registry ↔ blocs** via un test ou une assertion au build (vérifier que chaque `v('key')` dans un bloc correspond à un `item_key` dans le registry)

### Priorité moyenne
4. **Exclure `_global`** de la liste du mode Graphiques (ou le regrouper avec `rdc-map` dans une section "Paramètres spéciaux")
5. **Ajouter un bouton "Réinitialiser tout"** global qui supprime tous les overrides DB
6. **Ajouter `chart_type: null` explicitement** pour les items `geo` dans le registry et afficher "Multi-graphique" dans l'admin

### Priorité faible
7. Nettoyer l'import `Pencil` inutilisé
8. Ajouter une recherche textuelle dans le sélecteur d'onglets
9. Implémenter le drag-and-drop (dnd-kit) pour le réordonnancement

## Plan d'implémentation recommandé

### Étape 1 — Corriger la logique "Sauvegarder tout" + badge (critique)
- Remonter `localFilters` et `modified` du `FilterManager` dans le composant parent
- Inclure les filter items dans `handleSaveAll`
- Inclure les modifications filtres dans `hasChanges`

### Étape 2 — Ajouter dateField/statusField au mode Filtres
- Ajouter 2 selects dans `FilterManager` pour chaque onglet
- Stocker dans des items filter additionnels (`filter-date-field`, `filter-status-field`)
- Mettre à jour `useTabFilterConfig` pour lire ces overrides

### Étape 3 — Nettoyage
- Supprimer import `Pencil`
- Masquer `_global` dans le sélecteur d'onglets du mode Graphiques
- Ajouter labels explicites pour les items `geo` sans `chart_type`

### Fichiers modifiés
- `src/components/admin/AdminAnalyticsChartsConfig.tsx`
- `src/hooks/useAnalyticsChartsConfig.ts`
