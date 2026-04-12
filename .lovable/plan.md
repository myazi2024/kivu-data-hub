

# Audit Mode Test — Mise a jour pour les modifications recentes

## Problemes identifies

### 1. Parcelles : champs manquants pour les analytics
Le hook `useLandDataAnalytics` fetch `lease_years`, `is_subdivided`, `groupement`, `village`, `territoire`, `collectivite` sur les parcelles, mais `generateParcels` ne remplit pas :
- **`lease_years`** : jamais defini (la colonne existe en DB)
- **`is_subdivided`** : jamais defini
- **`groupement`** : jamais defini
- **`village`** : jamais defini (seul dans contributions)
- **`territoire`** : jamais defini sur les parcelles (seul dans contributions)
- **`collectivite`** : jamais definie sur les parcelles (seul dans contributions)
- **`property_category`** : jamais definie sur les parcelles (seul dans contributions)

Consequence : les graphiques d'analytics sur ces dimensions affichent 0 donnees en mode test.

### 2. Expertises : `parcel_id` manquant
`generateExpertiseRequests` recoit `parcelNumbers` (strings) mais n'a pas acces aux IDs des parcelles. La colonne `parcel_id` existe dans `real_estate_expertise_requests` mais n'est jamais remplie. Analytics utilise `enrich()` qui cherche `parcel_id` — les expertises test ne sont pas enrichies geographiquement.

### 3. Litiges : `parcel_id` manquant
Meme probleme : `generateDisputes` utilise `parcel_number` mais ne remplit pas `parcel_id`. Le filtre FK dans `useLandDataAnalytics` (`filterByTestFK`) ne fonctionne pas pour ces entites.

### 4. Mutations et lotissements : erreurs silencieuses
`generateMutationRequests` (ligne 1140) et `generateSubdivisionRequests` (ligne 1201) utilisent `console.error` sans `throw` — les echecs ne remontent pas dans `failedSteps`.

### 5. Contributions : champs manquants
`lease_years` n'est jamais defini dans `generateContributions` alors que la colonne existe.

### 6. Signature des generateurs incompatible
`generateExpertiseRequests` et `generateDisputes` ne recoivent pas l'objet `parcels` (avec IDs), empechant de remplir `parcel_id`.

---

## Plan de correction

### Fichier : `src/components/admin/test-mode/testDataGenerators.ts`

**A. Enrichir `generateParcels`** — ajouter les champs manquants :
- `lease_years` : `isSR ? randInt(10, 99) : null` (bail rural)
- `is_subdivided` : `idx % 20 === 0` (~5%)
- `groupement` : pour SR, `pick(['Mudaka', 'Irhambi', 'Bugorhe', 'Miti'], idx)`
- `village` : pour SR, `'Test Village ' + localIdx`
- `territoire` : pour SR, `pick(['Kabare', 'Kalehe', 'Nyiragongo', 'Walungu'], idx)`
- `collectivite` : pour SR, `pick(COLLECTIVITES_SR, idx)`
- `property_category` : `pick(PROPERTY_CATEGORIES, idx)`

**B. Modifier la signature de `generateExpertiseRequests`** :
- Changer le 2e parametre de `parcelNumbers: string[]` a `parcels: Array<{ id: string; parcel_number: string }>`
- Ajouter `parcel_id: p.id` dans chaque record
- Adapter la selection proportionnelle

**C. Modifier la signature de `generateDisputes`** :
- Changer le 1er parametre de `parcelNumbers: string[]` a `parcels: Array<{ id: string; parcel_number: string }>`
- Ajouter `parcel_id: p.id` dans chaque record

**D. Corriger les erreurs silencieuses** dans `generateMutationRequests` et `generateSubdivisionRequests` :
- Remplacer `console.error` par `throw new Error()`
- Utiliser `assertInserted()` pour validation

**E. Enrichir `generateContributions`** :
- Ajouter `lease_years` : `localIdx % 7 === 0 ? randInt(10, 99) : null`
- Ajouter `groupement` : pour SR, valeur coherente avec parcelles

### Fichier : `src/components/admin/test-mode/useTestDataActions.ts`

**F. Adapter les appels aux generateurs modifies** :
- `generateExpertiseRequests(userId, parcels, suffix)` au lieu de `(userId, parcelNumbers, suffix)`
- `generateDisputes(parcels, suffix, userId)` au lieu de `(parcelNumbers, suffix, userId)`
- Passer `parcelNumbers` ou `parcels` selon le nouveau contrat

---

## Section technique

**Fichiers modifies** :
- `src/components/admin/test-mode/testDataGenerators.ts` — enrichissement des champs, changement de signatures, correction erreurs silencieuses
- `src/components/admin/test-mode/useTestDataActions.ts` — adaptation des appels

**Aucune migration** requise — les colonnes existent deja.

