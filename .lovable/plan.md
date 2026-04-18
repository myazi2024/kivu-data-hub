
## Plan : Lot B — Modularisation de `useCCCFormState.ts`

### Objectif
Découper le hook monolithique (1 785 lignes, 35+ useState) en 4 sous-hooks spécialisés sans modifier le comportement observable. Le hook racine devient un **orchestrateur fin** qui compose les sous-hooks et expose la même API publique aux composants existants (`CadastralContributionDialog`, les 5 onglets).

### Stratégie : extraction iso-fonctionnelle
Aucune modif des onglets. Aucune modif du contrat de retour. Les sous-hooks reçoivent ce dont ils ont besoin via paramètres et exposent leur slice d'état + setters.

### Découpage

```text
src/hooks/ccc/
├── useCCCFormState.ts            (orchestrateur, ~400 l, ré-exporte tout)
├── useGeographicCascade.ts       (~250 l)
├── useConstructionCascade.ts     (~280 l)
├── useFormPersistence.ts         (~200 l)
└── useFormValidation.ts          (~450 l)
```

**1. `useGeographicCascade`** — extrait des l. ~340-560
- État : `provinces`, `cities`, `municipalities`, `quartiers` (cached lists)
- 4 useEffect cascades : province → cities → municipalities → quartiers
- Reset des enfants quand parent change
- Entrée : `formData.{province, city, municipality}`, `setFormData`
- Sortie : `{ provinces, cities, municipalities, quartiers }`

**2. `useConstructionCascade`** — extrait des l. ~570-740 + `useEffect [currentOwners]` (l. 1411) à corriger avec guard d'égalité (problème 3.5 audit)
- État : `availableNatures`, `availableUsages`, dérivés de `constructionType`/`constructionNature`
- Cascades : type → nature → usage (+ Location injection via `constructionUsageResolver`)
- Sync `previousOwners[last].endDate ← currentOwners[0].since` avec **guard JSON.stringify** sur `currentOwners[0].since` uniquement (fix 3.5)

**3. `useFormPersistence`** — extrait des l. ~200-330 + sauvegarde debounced + restore post-auth
- Logique `saveVersioned` / `loadVersioned` (déjà en place via `localStorageManager`)
- Debounce 1 500 ms de l'auto-save
- Tracking `submitUploadedPathsRef` + `rollbackUploadedFiles` (déjà en place)
- Entrée : `formData`, `user`, `STORAGE_KEY`, `STORAGE_SCHEMA_VERSION`
- Sortie : `{ rollbackUploadedFiles, trackUploadedPath, clearDraft, hasRestoredDraft }`

**4. `useFormValidation`** — extrait des l. ~641-892 (`getMissingFields*`) + memoization (fix 3.8 audit)
- `getMissingFieldsForTab(tab)` — par onglet
- `getMissingFields()` — global, **mémoïsé via `useMemo`** sur deps explicites (formData, currentOwners, parcelSides, gpsCoordinates, buildingShapes, etc.)
- `isFormValidForSubmission`, `isTabComplete`, `isTabAccessible` recalculés depuis le memo
- Sortie : `{ missingFields, isFormValidForSubmission, isTabComplete, isTabAccessible, getMissingFieldsForTab }`

**5. `useCCCFormState` (orchestrateur)**
- Conserve : tous les `useState` simples du formulaire (formData, parcelSides, gpsCoordinates, buildingShapes, currentOwners, previousOwners, files, …)
- Compose les 4 sous-hooks et ré-expose leur API à plat
- Conserve `handleSubmit`, `handleClose`, `triggerConfetti`, picklists getters
- **Contrat de retour identique** à l'actuel : aucun composant consommateur ne change

### Garanties non-régression
- API publique du hook **strictement identique** (mêmes noms, mêmes types).
- Sous-hooks dans `src/hooks/ccc/` → ancien chemin `src/hooks/useCCCFormState.ts` reste l'entrée publique (re-export).
- Aucun changement aux 5 onglets, à `CadastralContributionDialog`, à `useCadastralContribution`.
- Fix bonus inclus en passant : 3.5 (guard égalité currentOwners) + 3.8 (memo getMissingFields).

### Plan d'exécution (ordre)
1. Créer `src/hooks/ccc/useFormValidation.ts` (le plus isolé, pure fonction sur state)
2. Créer `src/hooks/ccc/useFormPersistence.ts` (autonome, déjà refactor partiel)
3. Créer `src/hooks/ccc/useGeographicCascade.ts` (4 useEffect cascades)
4. Créer `src/hooks/ccc/useConstructionCascade.ts` (cascades construction + fix sync owners)
5. Réécrire `src/hooks/useCCCFormState.ts` en orchestrateur fin qui compose les 4
6. Vérifier que tous les imports existants (`@/hooks/useCCCFormState`) résolvent toujours

### Validation E2E (manuelle après implémentation)
- Ouvrir le formulaire CCC, remplir les 5 onglets, soumettre.
- Recharger en cours de saisie → brouillon restauré (TTL/version OK).
- Changer Province → City/Municipality/Quartier se vident.
- Changer Type construction → Nature/Usage se vident, Location injecté si éligible.
- Frapper plusieurs caractères dans `currentOwners[0].firstName` → endDate de `previousOwners[last]` ne se ré-écrit PAS (fix 3.5).
- Vérifier dans React DevTools que `getMissingFields` n'est plus recalculé à chaque render (fix 3.8).

### Fichiers
- **Créés** : `src/hooks/ccc/useFormValidation.ts`, `useFormPersistence.ts`, `useGeographicCascade.ts`, `useConstructionCascade.ts`
- **Modifié (réécrit)** : `src/hooks/useCCCFormState.ts` (orchestrateur, ~400 l)
- **Inchangés** : 5 onglets, `CadastralContributionDialog`, `useCadastralContribution`
