

## Audit ciblé : IRL pour constructions additionnelles ne fonctionne pas

### Cause racine identifiée

Dans `ObligationsTab.tsx` (L213-217), le sélecteur « Construction concernée » du picklist IRL lit la mauvaise source :

```ts
const allRefs = buildRentalConstructionRefs(
  formData.declaredUsage,
  Array.isArray(formData.additionalConstructions) ? (...) : []
);
```

Or `formData.additionalConstructions` n'est **jamais peuplé pendant la saisie** : ce champ n'est construit que dans `useCadastralContribution.ts` (L1137-1138) au moment de la soumission. Pendant l'édition, le state vit dans la variable séparée `additionalConstructions` du hook, transmise correctement en prop à `ObligationsTab` (CadastralContributionDialog L176) **mais ignorée** par le sélecteur.

Conséquence : `allRefs` ne contient que `'main'` (si principale = Location), donc impossible de rattacher un IRL à une construction additionnelle. La validation détecte un IRL manquant qu'on ne peut pas créer → blocage soumission.

### Vérifications croisées

- ✅ Auto-assign dans `useCCCFormState.updateTaxRecord` (L444-448) utilise correctement le state `additionalConstructions` — c'est pourquoi la création initiale du record assigne parfois `additional:0`.
- ✅ Purge orphelins (L1221-1255) utilise le bon state.
- ✅ `ReviewTab` reçoit la prop correcte.
- ❌ Seul le **sélecteur visuel** d'`ObligationsTab` est en panne.

### Correctif (1 fichier, 4 lignes)

**`src/components/cadastral/ccc-tabs/ObligationsTab.tsx`**

1. L214-217 : remplacer
```ts
buildRentalConstructionRefs(
  formData.declaredUsage,
  Array.isArray(formData.additionalConstructions) ? (formData.additionalConstructions as any) : []
)
```
par
```ts
buildRentalConstructionRefs(
  formData.declaredUsage,
  Array.isArray(additionalConstructions) ? additionalConstructions : []
)
```
(utiliser la prop déjà destructurée L110, qui pointe vers le state vivant).

### Bonus — vérifier la même incohérence ailleurs

Recherche rapide à faire à l'implémentation : dans `ObligationsTab`, s'assurer qu'**aucune autre lecture** de `formData.additionalConstructions` ne subsiste (la prop `additionalConstructions` doit être l'unique source de vérité dans ce composant).

### Validation E2E

1. 1 construction principale (Habitation) + 2 constructions additionnelles (Location, Location) → IRL apparaît dans picklist taxe.
2. Sur un record IRL, ouvrir « Construction concernée » → doit afficher 2 options : « Construction #2 (...) » et « Construction #3 (...) ».
3. Sélectionner la #2, ajouter un 2e IRL, sélectionner la #3 → soumission OK.
4. Repasser la #2 en Habitation → IRL associé purgé automatiquement avec toast.
5. Cas mixte : principale Location + 1 additionnelle Location → 2 options (« Construction principale », « Construction #2 »).

