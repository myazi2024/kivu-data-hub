

# Corriger toutes les valeurs fictives restantes dans les données de test

## Problème

Deux fichiers de test insèrent des valeurs qui ne correspondent pas aux référentiels standardisés de l'application, polluant les graphiques Analytics avec des catégories fantômes.

## Divergences identifiées

### Fichier 1 : `testDataGenerators.ts` — Expertises (L348-432)

| Champ | Valeurs actuelles (fictives) | Valeurs du référentiel |
|-------|-----|------|
| `construction_quality` (×3) | `'bon'`, `'neuf'`, `'moyen'` | `'luxe'`, `'standard'`, `'economique'` (QUALITY_LABELS) |
| `road_access_type` (×3) | `'goudronné'`, `'terre'`, `'pavé'` | `'asphalte'`, `'terre'`, `'piste'` (ROAD_LABELS) |

### Fichier 1 : `testDataGenerators.ts` — Hypothèques (L690-711)

| Champ | Valeurs actuelles (fictives) | Valeurs du référentiel |
|-------|-----|------|
| `creditor_type` (×2) | `'banque'`, `'institution_financiere'` | `'Banque'`, `'Microfinance'` (picklist_creditor_type) |
| `mortgage_status` (×2) | `'active'`, `'completed'` | `'Active'`, `'Active'` (le 2e devient `'Renégociée'` pour varier — picklist_mortgage_status) |

### Fichier 2 : `testCadastralReport.ts` — Données mock (L90-107)

| Champ | Valeur actuelle (fictive) | Valeur du référentiel |
|-------|-----|------|
| `issuing_service` | `'Service Urbanisme Goma'` | `"Service Communal d'Urbanisme - Goma"` |
| `administrative_status` | `'Délivré'` | `'Conforme'` |
| `boundary_purpose` | `'Délimitation initiale'` | `'Réajustement ou rectification'` (CHECK constraint DB) |

## Corrections

### 1. `testDataGenerators.ts` — Expertises (~6 valeurs)
- `construction_quality`: `'bon'` → `'standard'`, `'neuf'` → `'luxe'`, `'moyen'` → `'economique'`
- `road_access_type`: `'goudronné'` → `'asphalte'`, `'pavé'` → `'piste'` (terre reste correct)

### 2. `testDataGenerators.ts` — Hypothèques (~4 valeurs)
- `creditor_type`: `'banque'` → `'Banque'`, `'institution_financiere'` → `'Microfinance'`
- `mortgage_status`: `'active'` → `'Active'`, `'completed'` → `'Renégociée'`

### 3. `testCadastralReport.ts` — Mock data (~3 valeurs)
- `issuing_service`: `'Service Urbanisme Goma'` → `"Service Communal d'Urbanisme - Goma"`
- `administrative_status`: `'Délivré'` → `'Conforme'`
- `boundary_purpose`: `'Délimitation initiale'` → `'Réajustement ou rectification'`

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/admin/test-mode/testDataGenerators.ts` | Corriger ~10 valeurs dans expertises et hypothèques |
| `src/utils/testCadastralReport.ts` | Corriger 3 valeurs mock |

2 fichiers modifiés, ~13 valeurs corrigées.

