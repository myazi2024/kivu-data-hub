## Constat

La fonctionnalité **existe déjà** dans `Règles de zonage` (admin) :
- Colonnes `parent_min_area_sqm` / `parent_max_area_sqm` sur `subdivision_zoning_rules` (migration `20260425110846`).
- Champs UI dans `AdminSubdivisionZoningRules.tsx` (section « Contraintes sur la parcelle-mère », lignes 789–844) avec popover d'aide.
- Vérification client dans `useParentParcelEligibility.ts` (codes `PARENT_TOO_SMALL`, `PARENT_TOO_LARGE`) consommée par `StepParentParcel.tsx` et `useSubdivisionForm.ts`.

**Failles à corriger** (optimisation) :
1. **Aucune vérification côté Edge Function** `subdivision-request` → contournable via appel direct, viole la règle mémoire « Server-side logic > frontend ».
2. **Validation admin laxiste** : on peut sauvegarder `parent_min_area_sqm` < `min_lot_area_sqm`, ou < `min_lot × (max_lots ou 1)`, ce qui crée des règles incohérentes (un lot minimum ne tiendrait pas dans la parcelle minimum).
3. **Pas de feedback live** dans le formulaire admin : on ne voit pas la cohérence entre les surfaces min lot, nombre max de lots et surface min parcelle-mère.
4. Champ `parent_min_area_sqm` placé après les contraintes de lots — il devrait être **mis en avant** (1ʳᵉ ligne de la section) puisque c'est le verrou d'entrée.

## Plan

### 1. Enforcement serveur (P0)
- `supabase/functions/subdivision-request/index.ts` : avant l'INSERT, charger la règle de zonage applicable (cascade géo identique à `useParentParcelEligibility`) et rejeter avec 422 si :
  - `area_sqm < parent_min_area_sqm`
  - `area_sqm > parent_max_area_sqm` (si défini)
- Retour structuré : `{ error: 'PARENT_AREA_OUT_OF_RANGE', min, max, actual }`.

### 2. Validation admin renforcée (P1)
Dans `AdminSubdivisionZoningRules.tsx` `handleSave` :
- Bloquer si `parent_min_area_sqm < min_lot_area_sqm` (toast clair).
- Bloquer si `parent_max_area_sqm` défini et < `parent_min_area_sqm`.
- Avertissement (toast.warning, non bloquant) si `parent_min_area_sqm < min_lot × 2` (zone trop petite pour un vrai lotissement).

### 3. UX admin (P1)
- Réordonner la section « Contraintes parcelle-mère » : `parent_min_area_sqm` + `parent_max_area_sqm` en première ligne, en `bg-primary/5` pour signaler leur importance.
- Ajouter sous le champ un **helper live** : « ≈ N lots de X m² maximum » calculé à partir de `min_lot_area_sqm`.
- Afficher `parent_min_area_sqm` dans la colonne « Aperçu » de la table des règles (badge `≥ X m²`).

### 4. Tests (P2)
- **Test backend** : nouveau `supabase/functions/subdivision-request/index.test.ts` qui pose une règle de test, soumet une parcelle trop petite et attend un 422 `PARENT_AREA_OUT_OF_RANGE`.
- **Test frontend** : `src/components/cadastral/subdivision/hooks/__tests__/useParentParcelEligibility.test.tsx` couvrant `PARENT_TOO_SMALL`, `PARENT_TOO_LARGE`, et le passage avec règle `*` fallback.
- Lancer la suite cart existante (`useCadastralCart.purge.test.tsx`) pour non-régression.

### 5. Mémoire
Mettre à jour `mem://admin/subdivision-admin-audit-fr.md` : nouvelle section « Lot G — Eligibilité parcelle-mère verrouillée serveur ».

## Fichiers modifiés
- `supabase/functions/subdivision-request/index.ts`
- `src/components/admin/AdminSubdivisionZoningRules.tsx`
- (nouveau) `supabase/functions/subdivision-request/index.test.ts`
- (nouveau) `src/components/cadastral/subdivision/hooks/__tests__/useParentParcelEligibility.test.tsx`
- `.lovable/memory/admin/subdivision-admin-audit-fr.md`

Aucune migration DB nécessaire (colonnes déjà présentes).

**Approuver pour passer en build ?**