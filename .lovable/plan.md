# Audit du service d'expertise immobilière — TERMINÉ ✅

## Corrections appliquées

### 1. ✅ Migration DB — 33 colonnes étendues ajoutées
Les données étendues (matériaux, équipements, son, position, appartement) sont maintenant stockées en colonnes dédiées dans `real_estate_expertise_requests` au lieu du JSON dans `additional_notes`.

### 2. ✅ Types TypeScript enrichis
`ExpertiseRequest` et `CreateExpertiseRequestData` dans `src/types/expertise.ts` incluent toutes les nouvelles colonnes.

### 3. ✅ Stockage en colonnes directes
`handleProceedToPayment()` écrit les champs étendus directement dans `formData` au lieu du JSON `additional_notes`.

### 4. ✅ Pré-remplissage CCC enrichi
- Ajout de `"Terrain non bâti"` et `"Non bâti"` dans le `categoryMap`
- Ajout du mapping `construction_nature` → `propertyCondition` (Durable→bon, Semi-durable→moyen, Précaire→mauvais)
- `prefillDoneRef.current = false` ajouté dans `handleClose()`

### 5. ✅ Validation renforcée
`constructionYear`, `totalBuiltAreaSqm` et `roadAccessType` sont maintenant obligatoires (required: true).

### 6. ✅ Score de complétion dynamique
Calcul adaptatif selon le type de bien (terrain nu vs bâti) incluant équipements et documents.

### 7. ✅ Unification `isTerrainNu`
`isTerrainNuLocal` supprimé, une seule variable `isTerrainNu` utilisée partout.

### 8. ✅ Analytics expertise enrichis
4 nouveaux graphiques ajoutés : matériau murs, matériau toiture, environnement sonore, position bâtiment. Équipements étendus (piscine, climatisation, solaire, etc.) intégrés au graphique existant.

### 9. ✅ Admin compatible ancien/nouveau format
`getExtendedData()` lit les colonnes DB en priorité avec fallback vers le JSON legacy.

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| Migration SQL | 33 colonnes ajoutées |
| `src/types/expertise.ts` | Types enrichis |
| `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx` | Stockage direct, prefillDoneRef, validation, score, isTerrainNu |
| `src/components/visualizations/blocks/ExpertiseBlock.tsx` | 4 nouveaux graphiques + équipements étendus |
| `src/hooks/useAnalyticsChartsConfig.ts` | Registre expertise enrichi (15→19 charts) |
| `src/components/admin/AdminExpertiseRequests.tsx` | getExtendedData avec fallback legacy |

# Audit du service de demande de mutation — TERMINÉ ✅

## Corrections appliquées

### 1. ✅ Migration DB — 8 colonnes dédiées ajoutées
`market_value_usd`, `expertise_certificate_url`, `expertise_certificate_date`, `title_age`, `mutation_fee_amount`, `bank_fee_amount`, `late_fee_amount`, `late_fee_days` ajoutées à `mutation_requests`.

### 2. ✅ Type `MutationRequest` aligné sur le schéma DB
Ajout de tous les champs manquants : `reviewed_at`, `reviewed_by`, `paid_at`, `payment_id`, `supporting_documents`, `beneficiary_id_document_url`, `requester_id_document_url`, et les 8 nouvelles colonnes. Création du type `MutationRequestWithProfile` pour les vues admin.

### 3. ✅ Stockage en colonnes directes
`createMutationRequest` dans le hook écrit désormais les données financières et documentaires dans les colonnes dédiées au lieu du JSON `proposed_changes`. Les documents sont écrits dans `supporting_documents` (colonne DB existante).

### 4. ✅ Données CCC exploitées
- Affichage du nom du propriétaire actuel (`current_owner_name`) dans la Card info parcelle
- Avertissement visuel si `is_title_in_current_owner_name === false`

### 5. ✅ Action "Renvoyer pour correction" admin
Option `returned` ajoutée dans le Select du process dialog avec notification adaptée au demandeur. Badge "À corriger" ajouté dans le mapping des statuts.

### 6. ✅ Analytics mutations enrichis
3 nouveaux graphiques ajoutés : Valeur vénale (tranches de prix), Ancienneté titre (< 10 ans vs ≥ 10 ans), Retard mutation (avec/sans retard). Registre `ANALYTICS_TABS_REGISTRY['mutations']` mis à jour (8→11 charts).

### 7. ✅ Admin compatible ancien/nouveau format
Le dialogue de détails admin lit les colonnes DB en priorité avec fallback vers le JSON legacy `proposed_changes`.

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| Migration SQL | 8 colonnes ajoutées |
| `src/types/mutation.ts` | Types alignés + MutationRequestWithProfile |
| `src/hooks/useMutationRequest.tsx` | Stockage en colonnes |
| `src/components/cadastral/MutationRequestDialog.tsx` | CCC affiché, avertissement titre, stockage colonnes |
| `src/components/admin/AdminMutationRequests.tsx` | Action returned, fallback colonnes/JSON |
| `src/components/visualizations/blocks/MutationBlock.tsx` | 3 nouveaux graphiques |
| `src/hooks/useAnalyticsChartsConfig.ts` | Registre mutations enrichi (8→11 charts) |
