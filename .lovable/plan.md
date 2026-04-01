

# Fix : Crash sur "Légende Carte" — `Cannot read properties of null (reading 'key')`

## Problème

Dans `AdminContributionConfig.tsx` (ligne 1430), le `.map()` itère sur `mapPreviewSettings.legend?.items` qui peut contenir des entrées `null` ou `undefined`. Quand on accède à `item.key`, ça crash.

De plus, dans le `onCheckedChange` (ligne 1437), `items[index]` utilise l'index du tableau affiché (qui inclut les valeurs par défaut), mais copie uniquement `legend.items` (qui peut être vide ou plus court). Cela crée un décalage d'index et des valeurs `undefined`.

## Solution

1. **Filtrer les items null** dans le `.map()` : ajouter `.filter(Boolean)` avant `.map()`
2. **Fusionner les items sauvegardés avec les defaults** au lieu de fallback complet — pour que les index correspondent toujours
3. **Protéger le `onCheckedChange`** avec une vérification que `items[index]` existe

## Modification

### `src/components/admin/AdminContributionConfig.tsx`

**Ligne 1423-1443** : Remplacer la logique de fallback par une fusion correcte des items par défaut avec les items sauvegardés (merge par `key`), et ajouter `.filter(Boolean)` avant `.map()`. Dans le handler `onCheckedChange`, construire le tableau `items` à partir de la même source fusionnée pour éviter le décalage d'index.

| Fichier | Modification |
|---|---|
| `src/components/admin/AdminContributionConfig.tsx` | Fusionner defaults + items sauvegardés par `key`, filtrer null, protéger handler |

