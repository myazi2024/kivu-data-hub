

# Données manquantes dans le mode test par rapport au formulaire CCC

## Constat

Après comparaison exhaustive des champs du formulaire CCC (GeneralTab, LocationTab, HistoryTab, ObligationsTab) avec les données générées dans `testDataGenerators.ts`, **de nombreux champs collectés ne sont pas du tout générés** dans les données test. Le genre du propriétaire en est un exemple, mais il y en a beaucoup d'autres.

## Champs manquants identifiés

### Onglet Général (GeneralTab)

| Champ formulaire | Colonne DB | Généré ? |
|---|---|---|
| Genre propriétaire | `current_owners_details` (JSON) | Non |
| `current_owners_details` complet (nom, prénom, post-nom, statut, entité, genre, since) | `current_owners_details` (JSON) | Non |
| `propertyCategory` | `property_category` | Non |
| `titleReferenceNumber` | `title_reference_number` | Non |
| `titleIssueDate` | `title_issue_date` | Non |
| `isTitleInCurrentOwnerName` | `is_title_in_current_owner_name` | Non |
| `constructionMaterials` | `construction_materials` | Non |
| `standing` | `standing` | Non |
| `floorNumber` | `floor_number` | Non |
| `apartmentNumber` | `apartment_number` | Non |
| `buildingPermits` (JSON) | `building_permits` | Non |
| `whatsappNumber` | `whatsapp_number` | Non |
| `houseNumber` | `house_number` | Non |
| `leaseYears` | (dans metadata/JSON) | Non |

### Onglet Localisation (LocationTab)

| Champ formulaire | Colonne DB | Généré ? |
|---|---|---|
| `parcelSides` (dimensions) | `parcel_sides` | Non |
| `roadSides` (côtés route) | `road_sides` | Non |
| `servitudeData` | `servitude_data` | Non |
| `buildingShapes` (croquis) | `building_shapes` | Non |
| `collectivite` (SR) | `collectivite` | Non |

### Onglet Historique (HistoryTab)

| Champ formulaire | Colonne DB | Généré ? |
|---|---|---|
| `ownershipHistory` (anciens propriétaires JSON) | `ownership_history` | Non |

### Onglet Obligations (ObligationsTab)

| Champ formulaire | Colonne DB | Généré ? |
|---|---|---|
| `taxHistory` (historique fiscal JSON) | `tax_history` | Non |
| `mortgageHistory` (hypothèques JSON) | `mortgage_history` | Non |
| `hasDispute` | `has_dispute` | Non |
| `disputeData` (détail litige JSON) | `dispute_data` | Non |

## Implémentation

### 1. `testDataGenerators.ts` — `generateContributions` : ajouter tous les champs manquants

Pour chaque contribution générée, ajouter :

```typescript
// Général
property_category: pick(['Maison', 'Appartement', 'Terrain nu', 'Immeuble'], idx),
title_reference_number: `REF-${prov.province.substring(0,3).toUpperCase()}-${String(idx).padStart(4,'0')}`,
title_issue_date: randomDateInPast(10),
is_title_in_current_owner_name: idx % 3 !== 0, // ~66% oui
construction_materials: constructionNature ? pick(['Briques cuites', 'Parpaings', 'Bois', 'Tôles'], idx) : null,
standing: constructionNature ? pick(['Haut standing', 'Moyen standing', 'Économique'], idx) : null,
floor_number: constructionNature ? String(randInt(0, 3)) : null,
apartment_number: idx % 15 === 0 ? `A${randInt(1,20)}` : null,
whatsapp_number: `+243${randInt(810000000, 899999999)}`,
house_number: idx % 2 === 0 ? String(randInt(1, 200)) : null,

// current_owners_details (JSON avec genre)
current_owners_details: [{
  lastName: pick(OWNER_NAMES, idx).split(' ')[0],
  firstName: pick(OWNER_NAMES, idx).split(' ')[1] || 'Test',
  middleName: idx % 3 === 0 ? 'Mutombo' : '',
  gender: idx % 2 === 0 ? 'Masculin' : 'Féminin',
  legalStatus: pick(LEGAL_STATUSES, idx),
  since: randomDateInPast(10),
  entityType: '', entitySubType: '', entitySubTypeOther: '',
  stateExploitedBy: '', rightType: '',
}],

// Building permits (JSON)
building_permits: constructionNature ? [{
  permitType: idx % 3 === 0 ? 'regularization' : 'construction',
  permitNumber: `PC-${randInt(2018,2025)}-${String(randInt(1,999)).padStart(3,'0')}`,
  issueDate: randomDateInPast(5),
  validityMonths: '36',
  issuingService: "Division Provinciale de l'Urbanisme",
}] : null,
```

### 2. `testDataGenerators.ts` — `generateContributions` : ajouter champs localisation

```typescript
// Localisation
parcel_sides: [
  { name: 'Nord', length: String(randInt(10, 50)) },
  { name: 'Sud', length: String(randInt(10, 50)) },
  { name: 'Est', length: String(randInt(10, 50)) },
  { name: 'Ouest', length: String(randInt(10, 50)) },
],
road_sides: [{ sideIndex: 0, roadName: prov.avenue }],
servitude_data: idx % 4 === 0 ? { hasServitude: true, width: randInt(1, 3) } : { hasServitude: false },
building_shapes: constructionNature ? [{ type: 'rectangle', points: [...] }] : [],
collectivite: isSR ? 'Kabare' : null,
```

### 3. `testDataGenerators.ts` — `generateContributions` : ajouter champs historique/obligations

```typescript
// Historique
ownership_history: idx % 3 === 0 ? [{
  name: `Ancien ${pick(OWNER_NAMES, idx + 5)}`,
  legalStatus: 'Personne physique',
  startDate: randomDateInPast(10),
  endDate: randomDateInPast(5),
  mutationType: pick(['Vente', 'Donation', 'Succession'], idx),
}] : [],

// Obligations
tax_history: [{
  taxType: 'Impôt foncier annuel',
  taxYear: String(new Date().getFullYear() - 1),
  taxAmount: String(randInt(20, 200)),
  paymentStatus: 'Payé',
  paymentDate: randomDateInPast(1),
}],
has_dispute: idx % 10 === 0,
dispute_data: idx % 10 === 0 ? { type: 'delimitation', description: 'Test litige' } : null,
mortgage_history: idx % 8 === 0 ? [{
  mortgageAmount: String(randInt(5000, 50000)),
  duration: '60',
  creditorName: 'Rawbank',
  creditorType: 'Banque',
  contractDate: randomDateInPast(5),
  mortgageStatus: 'Active',
}] : [],
```

### 4. `testDataGenerators.ts` — `generateParcels` : ajouter champs manquants

Ajouter aux parcelles générées les colonnes correspondantes :
- `title_reference_number`, `title_issue_date`, `standing`, `house_number`, `whatsapp_number`, `parcel_sides`

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `testDataGenerators.ts` | Enrichir `generateContributions` et `generateParcels` avec tous les champs manquants listés ci-dessus |

