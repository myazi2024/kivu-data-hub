

# Ajouter les visuels "Type de titre" et "Propriétaire actuel" dans l'onglet Titres fonciers

## Contexte

Le formulaire CCC (onglet Infos) collecte deux champs clés sur les parcelles :
- **`property_title_type`** — Type de titre de propriété (Certificat d'enregistrement, Contrat de location, etc.)
- **`current_owner_legal_status`** — Statut juridique du propriétaire actuel (Personne physique, Société, etc.)

Ces données existent dans `data.parcels` mais ne sont pas visualisées dans l'onglet "Titres fonciers". L'onglet a déjà des graphiques similaires mais alimentés par les **demandes de titre** (`titleRequests`) et non par les **parcelles cadastrées** :
- `legal-status` → utilise `owner_legal_status` des demandes (pas des parcelles)
- `deduced-title` → utilise `deduced_title_type` des demandes (pas des parcelles)

Il faut ajouter 2 nouveaux graphiques basés sur les données réelles du cadastre (parcelles).

## Modifications

### 1. `src/components/visualizations/blocks/TitleRequestsBlock.tsx`

- **Ajouter** `byParcelTitleType = countBy(data.parcels, 'property_title_type')` avec normalisation via `normalizeTitleType`
- **Ajouter** `byParcelOwnerStatus = countBy(data.parcels, 'current_owner_legal_status')`
- **Ajouter** 2 nouveaux chartDefs :
  - `parcel-title-type` : "Type de titre (cadastre)" — bar-h, source `data.parcels`, champ `property_title_type`
  - `parcel-owner-status` : "Propriétaire actuel" — donut, source `data.parcels`, champ `current_owner_legal_status`
- Import de `normalizeTitleType` depuis `@/utils/analyticsNormalizers`

### 2. `src/config/analyticsTabsRegistry.ts`

- **Ajouter** 2 entrées dans `title-requests.charts` :
  - `parcel-title-type` (display_order: 16, chart_type: 'bar-h', title: 'Type de titre (cadastre)')
  - `parcel-owner-status` (display_order: 17, chart_type: 'donut', title: 'Propriétaire actuel (cadastre)')

### 3. `src/config/crossVariables.ts`

- **Ajouter** dans `title-requests` :
  - `parcel-title-type`: `[{ label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }]`
  - `parcel-owner-status`: `[{ label: 'Province', field: 'province' }, { label: 'Type titre', field: 'property_title_type' }]`

### Fichiers modifiés (3)
- `src/components/visualizations/blocks/TitleRequestsBlock.tsx`
- `src/config/analyticsTabsRegistry.ts`
- `src/config/crossVariables.ts`

