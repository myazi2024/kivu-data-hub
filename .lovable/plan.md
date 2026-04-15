

# Supprimer "Terrain nu" du graphique "Catégorie de bien"

## Problème

Dans l'onglet **Parcelle** du dashboard Analytics, le graphique "Catégorie de bien" (`property_category`) inclut "Terrain nu" comme catégorie. Or, "Terrain nu" n'est pas une catégorie de bien à proprement parler — c'est l'absence de construction. De plus, il existe déjà un graphique dédié "Construites vs Non construites" qui couvre cette distinction, créant une redondance.

## Solution

Filtrer "Terrain nu" du jeu de données `byPropertyCategory` dans les deux blocs qui utilisent ce graphique.

### Fichiers modifiés

**1. `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`** (ligne 46)

```diff
-    byPropertyCategory: countBy(filteredParcels, 'property_category'),
+    byPropertyCategory: countBy(filteredParcels, 'property_category').filter(d => d.name !== 'Terrain nu'),
```

**2. `src/components/visualizations/blocks/ContributionsBlock.tsx`** (ligne 35)

```diff
-  const byPropertyCategory = useMemo(() => countBy(filtered, 'property_category'), [filtered]);
+  const byPropertyCategory = useMemo(() => countBy(filtered, 'property_category').filter(d => d.name !== 'Terrain nu'), [filtered]);
```

Deux lignes modifiées, zéro impact sur les autres graphiques.

