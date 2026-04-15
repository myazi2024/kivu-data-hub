

# Supprimer le visuel "Type titre" de l'onglet Parcelles

## Problème

Le graphique `title-type` ("Type titre") dans l'onglet **Parcelles** est redondant avec le graphique `deduced-title` ("Titre déduit") de l'onglet **Titres fonciers**. Les deux affichent la répartition des types de titres fonciers.

## Modifications

### 1. `src/config/analyticsTabsRegistry.ts` (ligne 36)
Supprimer l'entrée `title-type` du tableau `charts` de `parcels-titled`. Réajuster les `display_order` des entrées suivantes.

### 2. `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` (ligne 221-222)
Supprimer la définition du chart `title-type` dans `chartDefs`. Nettoyer les imports et données inutilisés (`byTitleType`, `normalizeTitleType` si plus utilisé ailleurs dans le fichier).

**Note** : `normalizeTitleType` est aussi utilisé pour `normalizedParcels` qui sert à d'autres charts (`construction-type`, `usage`), donc il reste nécessaire. Seule la ligne `byTitleType` dans `charts` et la définition `title-type` dans `chartDefs` sont à retirer.

| Fichier | Modification |
|---------|-------------|
| `src/config/analyticsTabsRegistry.ts` | Supprimer l'entrée `title-type` de `parcels-titled.charts` |
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | Supprimer le chart `title-type` de `chartDefs` + `byTitleType` de `charts` |

