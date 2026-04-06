

# Config Graphiques — Ajouter la gestion des variables de croisement

## Contexte

Le registre `CROSS_VARIABLE_REGISTRY` (dans `src/config/crossVariables.ts`) est entièrement hardcodé. L'admin n'a aucun moyen de :
- Activer/désactiver le picklist de croisement par graphique
- Ajouter/retirer des variables croisables
- Voir quels graphiques ont des variables de croisement

## Plan

### 1. Ajouter un 4e mode "Croisements" dans le toggle viewMode

À côté de `Onglets | Graphiques | Filtres`, ajouter un bouton **Croisements** (icône `GitBranch`).

### 2. Composant `CrossVariableManager`

Structure similaire au mode Graphiques (panneau gauche = onglets, panneau droit = config) :

- **Panneau gauche** : liste des 14 onglets analytics (exclure `_global`)
- **Panneau droit** : pour l'onglet sélectionné, afficher la liste des graphiques (issus du registry) qui ont des variables croisables. Pour chaque graphique :
  - Titre du graphique
  - Switch global pour activer/désactiver le picklist sur ce graphique
  - Liste des variables croisables avec pour chacune :
    - Switch on/off (visible dans le picklist ou non)
    - Label éditable
    - Champ source (field) éditable
  - Bouton "Ajouter une variable" pour enrichir la liste

### 3. Stockage dans `analytics_charts_config`

Réutiliser la table existante avec un nouveau `item_type: 'cross'` :

```
tab_key: 'title-requests'
item_key: 'cross-request-type'        // cross-{chartKey}
item_type: 'cross'
is_visible: true                       // picklist activé pour ce graphique
custom_title: JSON.stringify(variables) // [{label, field, enabled}]
```

Le champ `custom_title` stockera le JSON des variables (override des defaults du registry). Si pas d'override en DB, on utilise les defaults du `CROSS_VARIABLE_REGISTRY`.

### 4. Hook `useTabCrossConfig`

Nouveau hook (ou extension) qui retourne la config cross pour un onglet :

```typescript
export function useTabCrossConfig(tabKey: string, chartKey: string): CrossVariable[] {
  // Merge CROSS_VARIABLE_REGISTRY defaults avec overrides DB
  // Retourne uniquement les variables enabled
}
```

### 5. Mise à jour de `ChartCard`

Modifier la source des `crossVariables` : au lieu de les passer en prop depuis chaque bloc, `ChartCard` (ou les blocs) utiliseront le hook pour obtenir la liste filtrée.

### 6. Intégration dans hasChanges + handleSaveAll

- Ajouter `hasCrossChanges` dans le state parent
- Inclure les items `cross` dans `handleSaveAll`
- Badge "Non sauvegardé" reflète les modifications cross

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/components/admin/AdminAnalyticsChartsConfig.tsx` | Ajouter mode "Croisements" + `CrossVariableManager` + intégrer dans save/hasChanges |
| `src/hooks/useAnalyticsChartsConfig.ts` | Ajouter `useTabCrossConfig` hook + init des cross items |
| `src/config/crossVariables.ts` | Ajouter `getCrossVariablesWithOverrides()` helper |
| `src/components/visualizations/shared/ChartCard.tsx` | Utiliser config dynamique au lieu des props statiques |

