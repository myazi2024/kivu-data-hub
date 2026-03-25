

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
