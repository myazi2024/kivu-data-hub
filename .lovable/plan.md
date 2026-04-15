

# Audit et correction des variables de croisement — Analytics

## Résultat de l'audit

### A. Visuels SANS variables de croisement (doivent en avoir)

| Onglet | Chart key | Titre | Raison manquante |
|--------|-----------|-------|-----------------|
| **parcels-titled** | `built-vs-unbuilt` | Construites vs Non construites | Vient d'être ajouté, oublié |
| **parcels-titled** | `construction-decade` | Année construction | Oublié |
| **parcels-titled** | `gender` | Genre propriétaires | A `cx('gender')` mais `groupField="current_owner_legal_status"` — **groupField incorrect**, devrait être un champ genre |
| **contributions** | `fraud-reason` | Motif fraude | Oublié |
| **expertise** | `construction-decade` | Année construction | Oublié |
| **expertise** | `built-area` | Surface bâtie | Oublié |
| **expertise** | `equipment` | Équipements | Oublié |
| **expertise** | `sound-env` | Env. sonore (registry existe mais pas dans CROSS_VARIABLE_REGISTRY) | Manquant dans registry cross |
| **expertise** | `proximity` | Proximité moy. | Oublié |
| **expertise** | `garden` | Surface jardin | Oublié |
| **disputes** | `lifting-resolution-level` | Niveau résolution (levée) | Manque `crossVariables`/`rawRecords`/`groupField` |
| **disputes** | `lifting-reason` | Motif de levée | Manque `crossVariables`/`rawRecords`/`groupField` |

### B. Variables de croisement NON pertinentes

| Onglet | Chart key | Variable problématique | Problème |
|--------|-----------|----------------------|----------|
| **parcels-titled** | `title-type` | Entrée entière | Chart supprimé mais reste dans CROSS_VARIABLE_REGISTRY — **à supprimer** |
| **parcels-titled** | `gender` | `field: 'property_title_type'` | Le genre ne se croise pas utilement par type de titre ; mieux : `declared_usage`, `property_category` |
| **mortgages** | `amount-brackets` | `field: 'creditor_type'` | OK mais manque `field: 'mortgage_status'` |
| **invoices** | `status` | `field: 'geographical_zone'` | OK mais manque `field: 'payment_method'` — déjà présent comme `Paiement` → **en double avec payment-method cross** |

### C. groupField incorrects dans les composants

| Composant | Chart | groupField actuel | Correct |
|-----------|-------|-------------------|---------|
| ParcelsWithTitleBlock | `gender` | `current_owner_legal_status` | Devrait être un champ genre dérivé ou retiré (le genre est déduit, pas un champ direct) |

## Modifications prévues

### 1. `src/config/crossVariables.ts` — Ajouter les entrées manquantes + nettoyer

**Supprimer :** `parcels-titled` → `title-type` (chart supprimé)

**Ajouter :**

```text
parcels-titled:
  built-vs-unbuilt: [Province, Usage déclaré, Statut juridique]
  construction-decade: [Province, Usage déclaré, Catégorie de bien]

contributions:
  fraud-reason: [Type contribution, Province, Statut]

expertise:
  construction-decade: [Province, Qualité construction, Condition]
  built-area: [Province, Qualité construction, Condition]
  equipment: [Province, Qualité construction, Condition]
  sound-env: [Province, Qualité construction]
  proximity: [Province, Accès routier, Condition]
  garden: [Province, Qualité construction]

disputes:
  lifting-resolution-level: [Nature litige, Province, Statut levée]
  lifting-reason: [Nature litige, Province]
```

**Corriger pertinence :**
- `parcels-titled` → `gender` : remplacer `property_title_type` par `declared_usage` et `property_category`

### 2. Composants — Ajouter `crossVariables`/`rawRecords`/`groupField` aux charts manquants

**`ParcelsWithTitleBlock.tsx`** :
- `built-vs-unbuilt` : ajouter `crossVariables={cx('built-vs-unbuilt')} rawRecords={filteredParcels} groupField="property_category"`
- `construction-decade` : ajouter `crossVariables={cx('construction-decade')} rawRecords={filteredParcels} groupField="construction_year"`
- `gender` : corriger `groupField` → retirer ou adapter (genre est dérivé, pas un champ direct ; garder le cross mais corriger le groupField)

**`ContributionsBlock.tsx`** :
- `fraud-reason` : ajouter `crossVariables={cx('fraud-reason')} rawRecords={filtered} groupField="fraud_reason"`

**`ExpertiseBlock.tsx`** :
- `construction-decade` : ajouter `crossVariables={cx('construction-decade')} rawRecords={filtered} groupField="construction_year"`
- `built-area` : ajouter `crossVariables={cx('built-area')} rawRecords={filtered} groupField="total_built_area_sqm"`
- `equipment` : pas de groupField unique (données agrégées boolean) — **ne pas ajouter de cross** (structure incompatible)
- `proximity` : pas de groupField unique (données agrégées avg) — **ne pas ajouter de cross** (structure incompatible)
- `sound-env` : ajouter entrée dans CROSS_VARIABLE_REGISTRY expertise + `crossVariables={cx('sound-env')} rawRecords={filtered} groupField="sound_environment"`
- `garden` : ajouter `crossVariables={cx('garden')} rawRecords={filtered} groupField="garden_area_sqm"`

**`DisputesBlock.tsx`** :
- `lifting-resolution-level` : ajouter `crossVariables={cx('lifting-resolution-level')} rawRecords={liftingDisputes} groupField="resolution_level"`
- `lifting-reason` : ajouter `crossVariables={cx('lifting-reason')} rawRecords={liftingDisputes} groupField="lifting_reason"`

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/config/crossVariables.ts` | +12 entrées, -1 supprimée, 1 corrigée |
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | +cross sur 2 charts, fix groupField genre |
| `src/components/visualizations/blocks/ContributionsBlock.tsx` | +cross sur fraud-reason |
| `src/components/visualizations/blocks/ExpertiseBlock.tsx` | +cross sur 4 charts |
| `src/components/visualizations/blocks/DisputesBlock.tsx` | +cross sur 2 charts |

