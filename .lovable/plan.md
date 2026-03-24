

# Audit Admin — Divergences avec les indicateurs CCC

## Constat

L'espace admin est globalement bien aligné. **Une seule divergence significative** a été identifiée :

### Divergence : Données de test (testDataGenerators.ts, ligne 74)

Le générateur de parcelles de test utilise les **anciennes valeurs** pour `declared_usage` :

| Champ | Valeurs actuelles (ligne 74) | Valeurs CCC (source de vérité) |
|-------|------------------------------|-------------------------------|
| `declared_usage` | `Résidentiel`, `Commercial`, `Agricole`, `Mixte`, `Industriel` | `Habitation`, `Commerce`, `Agriculture`, `Usage mixte`, `Industrie` |
| `construction_nature` | `null` (au lieu de `'Non bâti'` pour terrain nu) | `Non bâti` |

**Note :** La ligne 125 (contributions de test) utilise déjà les bonnes valeurs CCC. Seule la ligne 74 (parcelles de test) est divergente.

### Points vérifiés sans divergence

- Aucun usage de `en_dur`/`semi_dur`/`en_paille` dans l'admin
- Aucun `Permis de construire`/`Permis de régularisation` résiduel
- Aucun normaliseur manquant dans les composants admin
- `AdminTerritorialZones` utilise `Usage mixte` correctement (c'est un champ de typologie de zone, pas un `declared_usage`)
- Les contributions (ligne 125) sont correctement alignées

## Plan de correction

### Fichier unique : `src/components/admin/test-mode/testDataGenerators.ts`

1. **Ligne 74** : Remplacer `['Résidentiel', 'Commercial', 'Agricole', 'Mixte', 'Industriel']` par `['Habitation', 'Commerce', 'Agriculture', 'Usage mixte', 'Industrie']`
2. **Ligne 76** : Remplacer `null` par `'Non bâti'` pour le terrain nu (index 2), en cohérence avec la ligne 127

