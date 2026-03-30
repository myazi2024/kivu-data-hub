

# Corriger la valeur `construction_nature` dans le générateur

## Problème
La contrainte CHECK sur `cadastral_parcels.construction_nature` autorise uniquement : `Durable`, `Semi-durable`, `Précaire`.

Le générateur utilise `'Non bâti'` pour les parcelles de type "Terrain nu", ce qui n'est pas dans la liste autorisée.

## Solution
Remplacer `'Non bâti'` par `null` dans `testDataGenerators.ts` pour les parcelles de type "Terrain nu" (un terrain nu n'a pas de construction, donc `null` est sémantiquement correct).

## Fichier impacté

| Fichier | Modification |
|---|---|
| `src/components/admin/test-mode/testDataGenerators.ts` | Lignes ~76 et ~127 : remplacer `'Non bâti'` par `null` dans les tableaux `construction_nature` |

