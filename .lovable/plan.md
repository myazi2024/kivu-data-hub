

# Audit Mode Test : Alignement aux modifications récentes

## Problème central

Les récentes modifications d'alignement CCC → Données foncières ont ajouté des champs et graphiques (occupation, étages, constructions additionnelles, etc.) que le **générateur de données test ne peuple pas**. Résultat : les nouveaux graphiques analytics affichent des données vides en environnement test.

## Anomalies détectées

### 1. Champs manquants dans `generateParcels` (7 champs)

| Champ | Type | Impact visuel |
|-------|------|---------------|
| `is_occupied` | boolean | Graphique "Occupation" vide |
| `occupant_count` | integer | KPI "Parcelles habitées" = 0 |
| `hosting_capacity` | integer | KPI "Capacité d'accueil" = 0 |
| `floor_number` | string | Graphique "Étages" vide |
| `additional_constructions` | jsonb | KPI "Multi-constructions" = 0 |
| `sound_environment` | string | Graphique "Environnement sonore" vide |
| `nearby_noise_sources` | string | Graphique "Sources de bruit" vide |

### 2. Champs manquants dans `generateContributions` (4 champs)

| Champ | Type | Impact visuel |
|-------|------|---------------|
| `is_occupied` | boolean | Graphique "Occupation" vide dans ContributionsBlock |
| `occupant_count` | integer | — |
| `hosting_capacity` | integer | — |
| `additional_constructions` | jsonb | — |

### 3. Terminologie non conforme

| Fichier | Ligne | Problème |
|---------|-------|----------|
| `TestDataStatsCard.tsx:48` | `'Permis bâtir'` | Doit être **'Autorisations'** (règle projet) |

## Plan de corrections

### Phase 1 — Enrichir `generateParcels` (testDataGenerators.ts ~L196-241)

Ajouter après `has_dispute` :
- `is_occupied`: ~65% `true`, ~25% `false`, ~10% `null` (terrain nu)
- `occupant_count`: 1-8 si occupé, null sinon
- `hosting_capacity`: 2-15 si construction, null sinon
- `floor_number`: `'0'` à `'5'` si construction, null sinon
- `additional_constructions`: ~20% des parcelles avec 1-2 constructions additionnelles (type, usage, surface)
- `sound_environment`: distribution réaliste (tres_calme → tres_bruyant)
- `nearby_noise_sources`: texte pour ~40% des parcelles

### Phase 2 — Enrichir `generateContributions` (testDataGenerators.ts ~L283-378)

Ajouter les 4 champs manquants :
- `is_occupied`, `occupant_count`, `hosting_capacity` : mêmes distributions que parcelles
- `additional_constructions` : ~15% avec données JSONB

### Phase 3 — Terminologie

- `TestDataStatsCard.tsx:48` : `'Permis bâtir'` → `'Autorisations'`

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/test-mode/testDataGenerators.ts` | +7 champs parcelles, +4 champs contributions |
| `src/components/admin/test-mode/TestDataStatsCard.tsx` | Renommer label |

## Résumé

| Catégorie | Count |
|-----------|-------|
| Champs manquants (parcelles) | 7 |
| Champs manquants (contributions) | 4 |
| Terminologie | 1 |

Après ces corrections, tous les graphiques analytics (occupation, étages, baux, bruit, multi-constructions) afficheront des données significatives en environnement test.

