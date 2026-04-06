

# Config Graphiques — Ajouter la gestion des filtres par onglet/indicateur

## Contexte

La page **Config Graphiques** (admin) gère actuellement :
- **Onglets** : visibilité, ordre, renommage des 14 onglets analytics
- **Graphiques/KPIs** : visibilité, ordre, titre, couleur, type de graphique

Ce qui **manque** : aucune interface pour configurer quels **filtres** sont disponibles par onglet (ex: masquer le filtre Statut pour l'onglet Fraude, masquer la cascade rurale pour Certificats, etc.). Chaque bloc utilise des props hardcodées (`hideStatus`, `dateField`, `statusField`) sans possibilité de configuration admin.

## Architecture existante

- `ChartConfigItem` dans `useAnalyticsChartsConfig.ts` stocke `tab_key`, `item_key`, `item_type`, `is_visible`, `display_order`, `custom_title`, `custom_color`, `chart_type`, `custom_icon`, `col_span`
- Table DB `analytics_charts_config` avec upsert sur `(tab_key, item_key)`
- `AnalyticsFilters.tsx` accepte les props `hideStatus`, `dateField`, `statusField`
- Les 14 blocs passent ces props en dur

## Plan d'implémentation

### 1. Etendre `ChartConfigItem` pour stocker la config filtres par onglet

Ajouter un nouveau type d'item `item_type: 'filter'` dans le registry, un par onglet, avec des propriétés stockées dans les champs existants (ou un champ JSON `config_value`).

Approche optimisée : utiliser `item_key: '__filters__'` et `item_type: 'tab'` (ou un nouveau type `'filter'`) par `tab_key`, avec un champ JSON pour les options de filtre.

Cependant, la table `analytics_charts_config` n'a pas de champ JSON libre. On va plutôt encoder les options filtre comme des items individuels avec `item_type: 'filter'` :

```
tab_key: 'ownership', item_key: 'filter-hide-status', item_type: 'filter', is_visible: false
tab_key: 'ownership', item_key: 'filter-hide-time', item_type: 'filter', is_visible: false  
tab_key: 'ownership', item_key: 'filter-hide-location', item_type: 'filter', is_visible: false
```

### 2. Définir le registre des filtres configurables

Dans `ANALYTICS_TABS_REGISTRY`, ajouter une nouvelle clé `filters` par onglet :

```typescript
filters: [
  { tab_key: 'ownership', item_key: 'filter-status', item_type: 'filter', is_visible: false, display_order: 0, custom_title: 'Filtre statut' },
  { tab_key: 'ownership', item_key: 'filter-time', item_type: 'filter', is_visible: true, display_order: 1, custom_title: 'Filtre temps' },
  { tab_key: 'ownership', item_key: 'filter-location', item_type: 'filter', is_visible: true, display_order: 2, custom_title: 'Filtre lieu' },
]
```

Chaque onglet aura les mêmes filtres par défaut (temps, lieu, section, statut), avec `is_visible` reflétant le comportement actuel hardcodé.

### 3. Ajouter un troisième mode dans `AdminAnalyticsChartsConfig`

Ajouter un bouton **"Filtres"** dans le toggle `viewMode` (à côté de Onglets / Graphiques) :

```
Onglets | Graphiques | Filtres
```

En mode Filtres :
- Panneau gauche : liste des 14 onglets (réutilisation du sélecteur existant)
- Panneau droit : pour l'onglet sélectionné, afficher les filtres avec Switch on/off :
  - Filtre temporel (Année / Semestre / Trimestre / Mois / Semaine)
  - Filtre géographique (Province / Section / Ville / Commune / Quartier / Avenue)
  - Filtre statut
  - Champ date source (select parmi les champs disponibles)
  - Champ statut source (select parmi les champs disponibles)

### 4. Hook `useTabFilterConfig`

Nouveau hook (ou extension de `useTabChartsConfig`) qui retourne la config filtres pour un onglet donné :

```typescript
export function useTabFilterConfig(tabKey: string) {
  const { configs } = useAnalyticsChartsConfig();
  // Merge defaults avec overrides DB
  return { hideStatus, hideTime, hideLocation, dateField, statusField };
}
```

### 5. Mise à jour des 14 blocs

Chaque bloc remplacera ses props hardcodées par le hook :

```typescript
// Avant (hardcodé)
<AnalyticsFilters hideStatus dateField="ownership_start_date" />

// Après (configurable)
const filterConfig = useTabFilterConfig('ownership');
<AnalyticsFilters 
  hideStatus={filterConfig.hideStatus} 
  dateField={filterConfig.dateField}
  statusField={filterConfig.statusField}
  hideTime={filterConfig.hideTime}
  hideLocation={filterConfig.hideLocation}
/>
```

### 6. Corriger les erreurs de build (prioritaire)

Les 7 fichiers blocs passent encore `hidePaymentStatus` / `paymentStatusField` à `<AnalyticsFilters>`. Bien que `grep` ne les trouve pas, les erreurs de build persistent. Il faut re-écrire explicitement les lignes concernées pour forcer la recompilation.

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/hooks/useAnalyticsChartsConfig.ts` | Ajouter `filters` au registry + `useTabFilterConfig` hook |
| `src/components/admin/AdminAnalyticsChartsConfig.tsx` | Ajouter mode "Filtres" avec UI de configuration |
| `src/components/visualizations/filters/AnalyticsFilters.tsx` | Ajouter props `hideTime`, `hideLocation` |
| 7 blocs dans `src/components/visualizations/blocks/` | Utiliser `useTabFilterConfig` + corriger erreurs build |

## Résumé
- 3 nouveaux concepts : `item_type: 'filter'`, `viewMode: 'filters'`, `useTabFilterConfig`
- Réutilisation complète de l'infrastructure existante (table DB, upsert, merge by key)
- Aucune migration DB requise (la table `analytics_charts_config` supporte déjà des item_type arbitraires)

