
## Étape 4/4 — Extraction de `useFormValidation` + finalisation orchestrateur

### Objectif
Dernière étape du Lot B : extraire la logique de validation/complétude vers `useFormValidation`, puis nettoyer `useCCCFormState.ts` pour qu'il devienne un orchestrateur fin (~400 l cible).

### Périmètre extrait depuis `useCCCFormState.ts`

**Vers `src/hooks/ccc/useFormValidation.ts`** :
- `getMissingFields(formData, currentOwners, ...)` — calcul des champs manquants par onglet (déjà mémoïsé fix 3.8)
- `isTabComplete(tabId)` — booléen par onglet
- `isTabAccessible(tabId)` — règle de progression (onglet N accessible si N-1 complet)
- `isFormValidForSubmission` — agrégat global (tous onglets complets + GPS + sound)
- `getCompletenessScore()` — calcul du score 14 champs + GPS + Sound (aligné sur logique SQL backend, cf. mem score-completude-ccc)

### Signature

```ts
// src/hooks/ccc/useFormValidation.ts
export function useFormValidation(params: {
  formData: CadastralContributionData;
  currentOwners: Owner[];
  previousOwners: Owner[];
  parcelSides: ParcelSide[];
  gpsCoordinates: GPSCoord[];
  buildingShapes: BuildingShape[];
  soundLevel: number | null;
  // autres slices nécessaires au calcul
}): {
  missingFields: Record<TabId, string[]>;
  isTabComplete: (tabId: TabId) => boolean;
  isTabAccessible: (tabId: TabId) => boolean;
  isFormValidForSubmission: boolean;
  completenessScore: number;
};
```

Tout en `useMemo` pour préserver le fix 3.8 (pas de recalcul à chaque frappe non liée).

### Garanties non-régression
- Mêmes règles, mêmes seuils, même score (référence : mem `score-completude-ccc`).
- Mêmes textes/labels de champs manquants (utilisés dans bandeaux UI).
- Contrat public de `useCCCFormState` strictement identique : `missingFields`, `isTabComplete`, `isTabAccessible`, `isFormValidForSubmission`, `completenessScore` continuent d'être exposés tels quels.
- Aucun changement d'ordre des hooks (appel inconditionnel au même endroit).

### Plan d'exécution
1. Lire `src/hooks/useCCCFormState.ts` pour identifier précisément les blocs validation/complétude restants.
2. Créer `src/hooks/ccc/useFormValidation.ts` avec la signature ci-dessus, tout mémoïsé.
3. Dans `useCCCFormState.ts` :
   - Supprimer les fonctions/`useMemo` extraits.
   - Ajouter `const validation = useFormValidation({ ... })` et déstructurer dans le retour.
4. Vérifier que le retour public reste byte-pour-byte compatible (mêmes clés, mêmes types).
5. Mesurer la taille finale de `useCCCFormState.ts` (cible : ~400 l).

### Validation post-implémentation
- TypeScript compile sans erreur.
- Bandeaux "champs manquants" affichent les mêmes messages.
- Les onglets passent au vert dans le même ordre / aux mêmes seuils.
- Score de complétude inchangé (vérifier sur un brouillon partiellement rempli).
- Bouton de soumission s'active/désactive aux mêmes conditions.

### Fichiers
- **Créé** : `src/hooks/ccc/useFormValidation.ts` (~150 l)
- **Modifié** : `src/hooks/useCCCFormState.ts` (suppression bloc validation, ajout appel sous-hook — orchestrateur final ~400 l)
- **Inchangés** : 5 onglets, `CadastralContributionDialog`, `useCadastralContribution`, `useFormPersistence`, `useGeographicCascade`, `useConstructionCascade`
