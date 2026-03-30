

# Corriger les valeurs `declared_usage` dans le générateur de données test

## Problème
La contrainte CHECK sur `cadastral_parcels.declared_usage` autorise uniquement :
`Résidentiel`, `Commercial`, `Mixte`, `Institutionnel`, `Industriel`, `Agricole`

Le générateur utilise des valeurs invalides : `Habitation`, `Commerce`, `Agriculture`, `Usage mixte`, `Industrie`.

## Solution
Remplacer toutes les valeurs `declared_usage` dans `testDataGenerators.ts` par les valeurs autorisées.

| Valeur actuelle | Valeur correcte |
|---|---|
| Habitation | Résidentiel |
| Commerce | Commercial |
| Agriculture | Agricole |
| Usage mixte | Mixte |
| Industrie | Industriel |

## Fichier impacté

| Fichier | Modification |
|---|---|
| `src/components/admin/test-mode/testDataGenerators.ts` | Remplacer les 5 occurrences de `declared_usage` aux lignes ~74, ~125, ~265, ~295, ~321 |

