

# Audit du service d'expertise immobiliere — Divergences et optimisations

## Problemes identifies

### 1. DONNEES ETENDUES STOCKEES EN JSON BRUT DANS `additional_notes` (majeur)

Le formulaire collecte ~30 champs etendus (materiaux, son, equipements, position, etc.) mais les stocke comme un blob JSON sérialise dans la colonne `additional_notes` de la table DB. La table `real_estate_expertise_requests` ne possede **aucune colonne** pour :
- `wall_material`, `roof_material`, `window_type`, `floor_material`
- `has_plaster`, `has_painting`, `has_ceiling`, `has_double_glazing`
- `building_position`, `facade_orientation`, `is_corner_plot`
- `sound_environment`, `nearby_noise_sources`
- `has_pool`, `has_air_conditioning`, `has_solar_panels`, `has_generator`, `has_water_tank`, `has_borehole`, `has_electric_fence`, `has_garage`, `has_cellar`, `has_automatic_gate`
- `internet_provider`, `number_of_rooms`, `number_of_bedrooms`, `number_of_bathrooms`
- `apartment_number`, `floor_number` (etage appart.), `total_building_floors`, `accessibility`, `monthly_charges`, `has_common_areas`
- `nearby_amenities`

**Consequence** : ces donnees ne sont pas exploitables en SQL (filtrage, tri, analytics). Le composant `ExpertiseBlock.tsx` ne peut pas generer de graphiques pour les materiaux, le son, les equipements etendus (piscine, climatisation, etc.) car ces champs n'existent pas en colonnes.

**Correction** : Creer une migration ajoutant les colonnes manquantes a la table DB, puis stocker directement au lieu du JSON dans `additional_notes`. Mettre a jour `CreateExpertiseRequestData`, `ExpertiseRequest` (types), le hook `useRealEstateExpertise`, et `handleProceedToPayment`.

### 2. REDONDANCE PARTIELLE AVEC LES DONNEES CCC

Le formulaire CCC (`cadastral_contributions`) collecte deja :
- `construction_type`, `construction_nature`, `construction_materials`, `construction_year`, `floor_number`, `property_category`

Le formulaire d'expertise re-collecte ces memes donnees (type, annee, etages, materiaux). Le pre-remplissage via `parcelData` (useEffect L245-287) attenué le probleme mais :
- Le mapping `categoryMap` est incomplet (ex: `"Terrain non bâti"` absent)
- Seul `construction_materials` → `wallMaterial` est mappe ; la toiture et le sol du CCC ne sont pas exploites
- Si `parcelData` n'est pas fourni (ouverture depuis un autre contexte), l'utilisateur re-saisit tout

**Correction** : Enrichir le pre-remplissage avec les champs CCC supplementaires disponibles (`construction_nature` → `propertyCondition` mapping, etc.). Ajouter un indicateur visuel plus clair pour les champs pre-remplis (par champ, pas juste l'alerte globale).

### 3. ANALYTICS EXPERTISE SOUS-EXPLOITEES

Le `ExpertiseBlock.tsx` n'exploite que les colonnes DB existantes. Avec les donnees etendues bloquees en JSON, il manque des graphiques pour :
- Repartition par materiau de mur/toiture
- Repartition par environnement sonore
- Taux d'equipements etendus (piscine, climatisation, solaire, etc.)
- Repartition par fournisseur internet
- Repartition par position sur parcelle

**Correction** : Une fois les colonnes DB ajoutees (point 1), enrichir `ExpertiseBlock.tsx` avec ces nouveaux graphiques et les enregistrer dans `ANALYTICS_TABS_REGISTRY['expertise']`.

### 4. VALIDATION TROP PERMISSIVE

`getMissingFields()` (L2082-2098) ne declare qu'un seul champ obligatoire : `constructionType`. Les champs suivants devraient etre requis pour une expertise serieuse :
- `constructionYear` pour les biens batis (impact direct sur la valeur)
- `totalBuiltAreaSqm` (sans surface, pas d'estimation possible)
- `roadAccessType` (facteur determinant en RDC)

**Correction** : Ajouter ces champs comme `required: true` dans `getMissingFields()`.

### 5. SCORE DE COMPLETION INEXACT

Le `completionPercentage` (L2106-2112) est calcule sur 16 champs hardcodes, sans inclure les equipements, documents, ni les champs d'appartement. Le score ne reflete pas la completude reelle du formulaire.

**Correction** : Calculer dynamiquement en fonction du type de bien (terrain nu vs bati vs appartement) et inclure les equipements et documents.

### 6. DOUBLE DECLARATION `isTerrainNu`

Deux variables identiques :
- `isTerrainNuLocal` (L993) utilisee dans `renderForm()`
- `isTerrainNu` (L2075) utilisee dans `renderSummary()`

Les deux font `constructionType === 'terrain_nu'`. C'est une redondance mineure.

**Correction** : Unifier en une seule variable.

### 7. `prefillDoneRef` NON REINITIALISE A LA FERMETURE

Le `handleClose()` reinitialise tous les champs mais ne remet pas `prefillDoneRef.current = false`. Si l'utilisateur ferme puis rouvre le dialogue sur une autre parcelle, le pre-remplissage ne s'effectuera pas.

**Correction** : Ajouter `prefillDoneRef.current = false;` dans `handleClose()`.

### 8. AUCUNE DONNEE FICTIVE DETECTEE

Les graphiques analytics et le formulaire n'utilisent aucune donnee fictive/simulee. Les indicateurs (`ExpertiseBlock`) sont tous construits a partir de requetes Supabase reelles. Pas de probleme ici.

### 9. FICHIER MONOLITHIQUE (3157 LIGNES)

Le composant `RealEstateExpertiseRequestDialog.tsx` est excessivement long. Il melange :
- ~60 variables d'etat
- Logique metier (paiement, upload, validation)
- 4 vues (form, summary, payment, confirmation)
- Mesure du son via microphone

**Correction** : Extraire en sous-composants (`ExpertiseFormTab`, `ExpertiseSummary`, `ExpertisePayment`, `ExpertiseConfirmation`) et un hook `useExpertiseFormState`.

---

## Plan d'implementation

### Etape 1 — Migration DB : ajouter les colonnes etendues
Creer une migration SQL ajoutant ~25 colonnes a `real_estate_expertise_requests` pour les donnees actuellement stockees en JSON.

### Etape 2 — Mettre a jour les types TypeScript
Enrichir `ExpertiseRequest` et `CreateExpertiseRequestData` dans `src/types/expertise.ts`.

### Etape 3 — Stocker les donnees etendues en colonnes
Modifier `handleProceedToPayment()` pour ecrire les champs directement dans `formData` au lieu du JSON `additional_notes`.

### Etape 4 — Corriger le pre-remplissage CCC
Reinitialiser `prefillDoneRef` a la fermeture. Enrichir le mapping CCC (ajouter `construction_nature`, corriger les cas manquants).

### Etape 5 — Renforcer la validation
Ajouter `constructionYear`, `totalBuiltAreaSqm` comme requis pour les biens batis.

### Etape 6 — Unifier `isTerrainNu` / Corriger le score de completion
Supprimer `isTerrainNuLocal`, rendre le score dynamique.

### Etape 7 — Enrichir les analytics expertise
Ajouter les nouveaux graphiques dans `ExpertiseBlock.tsx` et les enregistrer dans le registre de config.

### Fichiers impactes

| Fichier | Action |
|---------|--------|
| Migration SQL | Nouvelle migration |
| `src/types/expertise.ts` | Enrichir les types |
| `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx` | Corrections multiples |
| `src/hooks/useRealEstateExpertise.tsx` | Adapter au nouveau schema |
| `src/components/visualizations/blocks/ExpertiseBlock.tsx` | Nouveaux graphiques |
| `src/hooks/useAnalyticsChartsConfig.ts` | Registre expertise enrichi |
| `src/components/admin/AdminExpertiseRequests.tsx` | Afficher les nouvelles colonnes |

7 fichiers modifies + 1 migration.

