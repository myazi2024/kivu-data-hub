

# Harmonisation du bloc "Type de bien" (Expertise) avec le bloc "Construction" (CCC)

## Probleme

Le formulaire d'expertise utilise un picklist "Type de construction" avec des valeurs internes (villa, appartement, immeuble, duplex, studio, commercial, entrepot, terrain_nu) qui ne correspondent pas aux valeurs du bloc "Construction" du formulaire CCC (Catégorie de bien, Type de construction, Matériaux, Nature, Usage, Standing — toutes issues de `useCCCFormPicklists`).

De plus, le champ "Qualité" (Luxe/Standard/Économique) dans l'onglet Général est un doublon du "Standing" du CCC, et le champ "Murs/Élévation" de l'onglet Matériaux fait doublon avec "Matériaux" du CCC.

## Solution

Remplacer le bloc "Type de bien" de l'onglet Général par une copie du bloc Construction du CCC, en utilisant les memes picklists dynamiques (`useCCCFormPicklists`). Supprimer les champs devenus redondants.

## Plan

### 1. Integrer `useCCCFormPicklists` dans le formulaire d'expertise

Importer le hook et reproduire la logique de dependances hierarchiques :
- **Catégorie de bien** → `PROPERTY_CATEGORY_OPTIONS` (picklist suggestif existant)
- **Type de construction** → dependant de la categorie (Résidentielle, Commerciale, etc.)
- **Matériaux** → dependant de la nature
- **Nature** → auto-determinee par les materiaux (lecture seule)
- **Usage** → dependant du type + nature
- **Standing** → dependant de la nature

Remplacer les states `constructionType` (string key) et `constructionQuality` par des states alignes sur le CCC : `propertyCategory`, `constructionType` (valeurs CCC), `constructionNature`, `constructionMaterials`, `declaredUsage`, `standing`.

### 2. Supprimer les champs redondants

| Champ supprime | Raison |
|---|---|
| `constructionQuality` (Luxe/Standard/Économique) | Remplace par `standing` (Haut standing/Moyen standing/Économique) du bloc Construction |
| `wallMaterial` (onglet Materiaux) | Remplace par `constructionMaterials` (Béton armé, Parpaings, etc.) du bloc Construction |

L'onglet "Matériaux" conserve : Toiture, Fenêtres, Sol/Revêtement, Finitions (crépi, peinture, plafond, double vitrage) — ces champs sont specifiques a l'expertise et n'existent pas dans le CCC.

### 3. Adapter le prefill depuis parcelData

Simplifier la logique de prefill : les valeurs CCC (`property_category`, `construction_type`, `construction_nature`, `construction_materials`) sont deja dans le bon format — plus besoin de mapping (categoryMap, materialMap). Le prefill devient un transfert direct.

### 4. Adapter `isTerrainNu` et `isApartmentOrBuilding`

- `isTerrainNu` → `propertyCategory === 'Terrain nu'` ou `constructionType === 'Terrain nu'`
- `isApartmentOrBuilding` → `propertyCategory === 'Appartement'`

### 5. Adapter la soumission et le resume

- Mapper les nouvelles valeurs vers les colonnes DB existantes (`construction_quality` → `standing`, `wall_material` → `constructionMaterials`)
- Mettre a jour le resume (step summary) avec les nouveaux labels

### 6. Supprimer les constantes inutilisees

Dans `expertiseLabels.ts`, `CONSTRUCTION_TYPE_LABELS` et `QUALITY_LABELS` ne seront plus utilisees par le formulaire d'expertise (elles restent utilisees par l'admin/analytics le cas echeant).

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `RealEstateExpertiseRequestDialog.tsx` | Remplacement bloc "Type de bien" par bloc Construction CCC, suppression champs redondants, adaptation prefill/soumission/resume |
| `expertiseLabels.ts` | Nettoyage si `CONSTRUCTION_TYPE_LABELS`/`QUALITY_LABELS` ne sont plus references ailleurs |

