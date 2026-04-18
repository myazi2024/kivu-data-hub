
## Étape 3/4 — Extraction de `useGeographicCascade` et `useConstructionCascade`

### Objectif
Extraire les deux cascades de dépendances (géographique et construction) du hook monolithique vers deux sous-hooks dédiés. Aucune modification du comportement observable.

### Sous-hook 1 : `useGeographicCascade`

**Périmètre extrait** depuis `useCCCFormState.ts` :
- `useEffect` Province → reset City / Municipality / Quartier
- `useEffect` City → reset Municipality / Quartier
- `useEffect` Municipality → reset Quartier
- Logique de filtrage des options dépendantes (via `getPicklistDependentOptions`)

**Signature** :
```ts
// src/hooks/ccc/useGeographicCascade.ts
export function useGeographicCascade(params: {
  formData: CCCFormData;
  updateFormData: (patch: Partial<CCCFormData>) => void;
}): void;
```
Hook à effets uniquement (pas de retour) — il observe `formData.province/city/municipality` et émet les resets.

### Sous-hook 2 : `useConstructionCascade`

**Périmètre extrait** :
- `useEffect` Construction Type → reset Nature, Declared Usage
- `useEffect` Construction Nature → reset Declared Usage
- Calcul des `availableUsages` via `resolveAvailableUsages` (réutilisation de l'utilitaire existant `src/utils/constructionUsageResolver.ts`, ne pas dupliquer)
- Injection conditionnelle de `Location` (déjà gérée dans le resolver)

**Signature** :
```ts
// src/hooks/ccc/useConstructionCascade.ts
export function useConstructionCascade(params: {
  formData: CCCFormData;
  updateFormData: (patch: Partial<CCCFormData>) => void;
  getPicklistDependentOptions: (key: string) => Record<string, string[]>;
}): {
  availableUsages: string[];
};
```

### Garanties non-régression
- Mêmes effets, mêmes ordres de reset.
- `resolveAvailableUsages` reste l'unique source de vérité (utilisé aussi par `AdditionalConstructionBlock`).
- Le contrat public de `useCCCFormState` reste strictement identique : `availableUsages` continue d'être exposé.

### Plan d'exécution
1. Créer `src/hooks/ccc/useGeographicCascade.ts` (effets uniquement).
2. Créer `src/hooks/ccc/useConstructionCascade.ts` (effets + retour `availableUsages`).
3. Dans `useCCCFormState.ts` :
   - Supprimer les 3 `useEffect` géographiques.
   - Supprimer les 2 `useEffect` construction.
   - Ajouter `useGeographicCascade({ formData, updateFormData })`.
   - Ajouter `const { availableUsages } = useConstructionCascade({ formData, updateFormData, getPicklistDependentOptions })`.
4. Vérifier que `availableUsages` reste exposé dans le retour du hook racine.

### Validation post-implémentation
- TypeScript compile sans erreur.
- Contrat public de `useCCCFormState` strictement identique.
- Test manuel rapide : changer Province → City se vide ; changer Construction Type → Nature/Usage se vident ; éligibilité `Location` préservée.

### Note sur l'erreur runtime
"Should have a queue" — erreur React liée à un hook conditionnel ou à un changement d'ordre de hooks. Je vérifierai après l'extraction que l'ordre des hooks dans `useCCCFormState` reste stable (les nouveaux sous-hooks appelés inconditionnellement, au même endroit qu'avant).

### Fichiers
- **Créés** : `src/hooks/ccc/useGeographicCascade.ts` (~60 l), `src/hooks/ccc/useConstructionCascade.ts` (~60 l)
- **Modifié** : `src/hooks/useCCCFormState.ts` (suppression des 5 useEffect, ajout des 2 appels de sous-hooks)
- **Inchangés** : 5 onglets, `CadastralContributionDialog`, `constructionUsageResolver.ts`, `AdditionalConstructionBlock`
