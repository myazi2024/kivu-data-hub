

## Correctif : afficher IRL dans le picklist Taxes dès qu'une construction est en Location

### Problème identifié
Le flag `hasAnyRentalUsage` (calculé dans `useCCCFormState.ts`) est probablement bien défini, mais il n'est **pas consommé** par le composant qui rend la liste des types de taxe dans l'onglet Obligations. Résultat : « Impôt sur le revenu locatif » reste masqué même quand au moins une construction (principale ou additionnelle) a `declaredUsage === 'Location'`.

### Exploration nécessaire (en mode édition)
1. `src/hooks/useCCCFormState.ts` — confirmer existence et export de `hasAnyRentalUsage`.
2. Composant du sous-onglet Taxes dans l'onglet Obligations (probablement `ObligationsTab.tsx` ou un sous-composant `TaxRecordForm.tsx` / `TaxHistoryBlock.tsx`).
3. Identifier la source du picklist `picklist_tax_type` (registry `useCCCFormPicklists`) → la liste contient `'Impôt sur les revenus locatifs'` par défaut.

### Correction

**1. Exposer le flag (si absent)**
Dans `useCCCFormState.ts`, garantir :
```ts
const hasAnyRentalUsage =
  formData.declaredUsage === 'Location' ||
  additionalConstructions.some(c => c.declaredUsage === 'Location');
```
Et l'inclure dans le `return` du hook.

**2. Filtrer le picklist Taxes**
Dans le composant qui rend le `<Select>` du type de taxe (onglet Obligations) :
```ts
const taxTypeOptions = getOptions('picklist_tax_type').filter(opt => {
  if (opt === 'Impôt sur les revenus locatifs') return hasAnyRentalUsage;
  return true;
});
```
- Si `hasAnyRentalUsage === false` → IRL masqué.
- Si `true` → IRL apparaît normalement dans le picklist.

**3. Tooltip d'information (UX)**
Quand IRL est masqué, ajouter une note discrète sous le champ :
> « L'Impôt sur le revenu locatif s'affiche automatiquement dès qu'au moins une construction est déclarée en usage "Location". »

**4. Purge déjà en place**
La purge automatique des entrées IRL quand `hasAnyRentalUsage` devient `false` est déjà implémentée — pas de changement.

### Fichiers à modifier
- `src/hooks/useCCCFormState.ts` (vérifier export du flag)
- `src/components/cadastral/ccc-tabs/ObligationsTab.tsx` (ou sous-composant des taxes — à confirmer en édition)

### Validation E2E
- Onglet Infos : aucune construction en Location → onglet Obligations → IRL absent du picklist.
- Cocher `Location` sur la construction principale → retour Obligations → IRL apparaît immédiatement.
- Cocher `Location` uniquement sur une construction additionnelle (principale en Habitation) → IRL apparaît également.
- Décocher toutes les `Location` → IRL disparaît + entrées IRL existantes purgées (toast).

