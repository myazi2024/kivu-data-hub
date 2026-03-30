# Augmenter le volume de données test : 20 parcelles par province (15 SU + 5 SR) étalonné sur 10 ans passé

## Constat actuel

Le générateur crée **5 parcelles au total** (1 par province), avec des données hardcodées par index. C'est insuffisant pour tester les flux à l'échelle.

## Objectif

**100 parcelles** (5 provinces × 20 parcelles) dont 15 SU et 5 SR par province, avec des données réalistes variées pour chaque et étalonnées sur les 10 ans passé. Les entités enfant (contributions, factures, etc.) doivent être mises à l'échelle proportionnellement. Ensuitee 

## Implémentation

### 1. `testDataGenerators.ts` — Refactorer `generateParcels`

Remplacer les tableaux hardcodés par une génération dynamique en boucle sur les 5 provinces :

```typescript
const PARCELS_PER_PROVINCE = 20; // 15 SU + 5 SR

// Pour chaque province, générer 20 parcelles avec :
// - Les 15 premières en type 'SU', les 5 dernières en 'SR'
// - declared_usage, construction_nature, area_sqm randomisés dans les valeurs autorisées
// - GPS coordinates variées autour du centre-ville de chaque province
// - parcel_number: TEST-{provinceIndex}-{parcelIndex}-{suffix}
```

Valeurs randomisées par parcelle :

- `declared_usage` : cycle parmi `['Résidentiel', 'Commercial', 'Mixte', 'Institutionnel', 'Industriel', 'Agricole']`
- `construction_nature` : `null` pour ~20% (terrains nus), sinon cycle `['Durable', 'Semi-durable', 'Précaire']`
- `area_sqm` : entre 200 et 5000
- `property_title_type` : cycle parmi les 3 types existants

### 2. `testDataGenerators.ts` — Mettre à l'échelle les entités enfant


| Entité                | Actuel | Cible | Logique                   |
| --------------------- | ------ | ----- | ------------------------- |
| Parcelles             | 5      | 100   | 20/province               |
| Contributions         | 5      | 100   | 1 par parcelle            |
| Factures              | 3      | ~30   | 30% des parcelles         |
| Paiements             | 2      | ~20   | Sur factures payées       |
| Codes CCC             | 3      | ~30   | Sur 30% des contributions |
| Titres fonciers       | 3      | 10    | 2/province                |
| Expertises            | 3      | 10    | 2/province                |
| Litiges               | 3      | 10    | 2/province                |
| Mutations             | 3      | 10    | 2/province                |
| Lotissements          | 1      | 5     | 1/province                |
| Ownership/Tax history | 3-4    | 20    | Sous-ensemble parcelles   |
| Bornages/Hypothèques  | 2-3    | 10    | Sous-ensemble parcelles   |
| Fraudes               | 2      | 10    | 2/province                |
| Certificats           | 2      | 10    | 2/province                |


### 3. `testDataGenerators.ts` — Refactorer `generateContributions`

Adapter pour accepter 100 parcelles, en variant les statuts (`pending`, `approved`, `rejected`) par cycle, les types (`creation`, `update`), et les scores de fraude.

### 4. `useTestDataActions.ts` — Adapter les appels

Le flux reste identique mais les fonctions reçoivent des tableaux plus grands. Adapter le message de succès pour afficher les bons compteurs.

### 5. `rollbackTestData` — Adapter au nouveau nommage

Le pattern `TEST-{provinceIdx}-{parcelIdx}-{suffix}` doit être supporté par le rollback (déjà basé sur `parcelNumbers` array, donc compatible).

### Fichiers modifiés


| Fichier                 | Modification                                                                      |
| ----------------------- | --------------------------------------------------------------------------------- |
| `testDataGenerators.ts` | Refactorer toutes les fonctions de génération pour produire des volumes réalistes |
| `useTestDataActions.ts` | Adapter le message de succès                                                      |
