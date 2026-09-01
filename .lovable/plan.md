# Revue du formulaire CCC — bugs, logique et code orphelin

Revue front-end et back-end après les dernières mises à jour (hauteur/étages, croquis, calquer sur la parcelle). Chaque constat a été vérifié par lecture du code ou requête en base.

## Constats vérifiés

### Bloquant

1. **La hauteur de la construction principale n'est jamais enregistrée.**
   `buildingHeight` est déclaré (`useCadastralContribution.tsx:94`), saisi (`ConstructionSection.tsx:359-362`), synchronisé avec le croquis et **exigé par la validation** (`useFormValidation.ts:331-354`), mais il n'apparaît nulle part dans `buildContributionPayload` (`useCadastralContribution.tsx:354-466`). Vérifié en base : aucune colonne `building_height` sur `cadastral_contributions` ni `cadastral_parcels` (seules `apartment_height` et `floor_number` existent). La donnée exigée à l'utilisateur est donc perdue à la soumission, alors que la hauteur des constructions additionnelles (`heightM`) survit puisque le tableau est sérialisé en bloc.

### Bugs

2. **Supprimer une construction additionnelle laisse des formes du croquis mal liées.**
   `removeAdditionalConstruction` (`useCCCFormState.ts:230-269`) réindexe `taxRecords` et `marketListings` mais jamais `buildingShapes`, dont les entrées portent un `linkedIndex` sur les mêmes positions (`ParcelMapPreview.tsx:57`). Après suppression : une forme peut pointer vers une autre construction (décalage silencieux, hauteur appliquée au mauvais bloc) ou devenir fantôme tout en comptant dans le nombre de tracés requis (`useFormValidation.ts:325-327`).

3. **Compteur de tracés requis incohérent pour « Appartement ».**
   `LocationTab.tsx:115` calcule `requiredBuildingCount = 1` et le croquis affiche l'exigence, alors que la validation exempte totalement cette catégorie (`useFormValidation.ts:324`). L'UI réclame un tracé que rien n'impose.

### Code orphelin

4. `isTerrainNuCategory` est redéfini localement dans `RentalConfigurationFields.tsx:63-64` avec une signature différente de la source de vérité `cccPredicates.ts:31-32`, et n'est importé nulle part — duplication à risque de divergence.
5. `hasRestoredDraft` est calculé et exposé par `useFormPersistence.ts` (100/220/290) mais jamais consommé par `useCCCFormState.ts`.
6. `useCadastralContribution.tsx:737` et `:900` nettoient les clés localStorage `ccc_form_draft` / `ccc_form_draft_<parcelle>` qui ne sont écrites nulle part ; la vraie clé est `cadastral_contribution_<parcelle>` (nettoyée correctement juste à côté).
7. `warnings: string[]` dans `cccApproval.ts:25/73` n'est jamais alimenté.

### Mineur

8. `current_owner_name` / `current_owner_legal_status` / `current_owner_since` sont mis à `undefined` (`useCadastralContribution.tsx:368-376`) au lieu de `null`, contrairement au reste du payload : la clé disparaît de la requête au lieu d'effacer la valeur — problématique en mode édition d'une contribution existante.

### Vérifié sans anomalie

`minHeightForFloors` (source unique, cohérente entre champ, blocs additionnels, croquis et validation) ; règles conditionnelles par catégorie (Terrain nu, Appartement, Local commercial, Entrepôt/Hangar) — aucun champ requis mais masqué sans issue ; `parcelSideNumbering` ; `cccApproval.ts` (pas de double insertion d'historiques, filtre `deleted_at` présent, statuts en anglais) ; restauration du brouillon localStorage.

## Correctifs prévus

### A. Persistance de la hauteur (priorité 1)
- Migration : ajouter `building_height numeric` sur `cadastral_contributions` **et** `cadastral_parcels`, puis recopier la colonne dans les deux branches (INSERT et UPDATE) de `sync_approved_contribution_to_parcel`.
- Ajouter `building_height` à `buildContributionPayload` et à la relecture en mode édition, et afficher la hauteur dans le récapitulatif (`ReviewTab`).

### B. Intégrité du croquis
- Réindexer `buildingShapes` dans `removeAdditionalConstruction` : supprimer les formes liées à l'index retiré, décrémenter les `linkedIndex` supérieurs (même logique que le remap existant pour taxes et annonces).
- Aligner `requiredBuildingCount` sur la validation : 0 tracé requis pour « Appartement ».

### C. Nettoyage
- Supprimer le `isTerrainNuCategory` local et utiliser celui de `cccPredicates.ts`.
- Retirer `hasRestoredDraft` (ou le consommer pour un message « brouillon restauré » — par défaut : retrait).
- Supprimer les nettoyages des clés localStorage mortes.
- Retirer `warnings` de `ApproveOutcome` et de ses consommateurs.
- Passer les `current_owner_*` à `null` plutôt qu'`undefined`.

### D. Tests
Étendre `src/hooks/ccc/__tests__/useFormValidation.test.ts` et ajouter des cas sur la réindexation de `buildingShapes` après suppression d'une construction additionnelle.

## Détails techniques

Fichiers : `src/hooks/useCadastralContribution.tsx`, `src/hooks/useCCCFormState.ts`, `src/hooks/ccc/useFormPersistence.ts`, `src/hooks/ccc/useFormValidation.ts`, `src/components/cadastral/ccc-tabs/LocationTab.tsx`, `src/components/cadastral/ccc-tabs/ReviewTab.tsx`, `src/components/cadastral/RentalConfigurationFields.tsx`, `src/components/admin/ccc/cccApproval.ts`.

Une seule migration SQL (colonne `building_height` + mise à jour du trigger). Ordre suggéré : A → B → C → D, chaque bloc livrable indépendamment.
