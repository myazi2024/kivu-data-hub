

## Plan : IRL par construction (1 IRL par construction en Location)

### Contexte
La logique actuelle calcule déjà `rentalConstructionsCount` (principale + additionnelles en Location) et exige `irlEntriesCount === rentalConstructionsCount`. Mais :
- L'option IRL dans le picklist « Type de taxe » dépend du flag global `hasAnyRentalUsage` → ✅ déjà OK dès qu'**au moins une** construction est en Location.
- Manque : **identification de la construction** rattachée à chaque entrée IRL + UX qui guide à saisir 1 IRL par construction Location.

### Vérifications à faire
1. Confirmer que IRL apparaît bien dès qu'**une seule** construction additionnelle est en Location (pas seulement la principale).
2. Confirmer le shape de `taxRecords` (champ pour rattacher la construction).

### Modifications

#### 1. Picklist IRL — confirmation logique globale
- `useCCCFormState.ts` : `hasAnyRentalUsage = main.declaredUsage === 'Location' || additional.some(c => c.declaredUsage === 'Location')`.
- Vérifier que le composant TaxesTab consomme ce flag (et non `formData.declaredUsage` seul). Corriger si régression.

#### 2. Rattachement IRL ↔ Construction
- Étendre le type `TaxRecord` avec un champ optionnel `constructionRef` :
  - `'main'` pour la construction principale
  - `'additional:<id>'` pour une construction additionnelle (utiliser l'`id` stable déjà présent dans `additionalConstructions`)
- Dans le formulaire de saisie d'une taxe IRL (sous-onglet Taxes) :
  - Afficher un sélecteur **« Construction concernée »** uniquement quand `taxType === 'Impôt sur les revenus locatifs'`.
  - Options = liste des constructions en Location (label : « Principale », « Construction #2 (Commerciale, 2018) », etc.).
  - Filtrer les options déjà rattachées à un autre IRL pour empêcher les doublons.
  - Champ obligatoire (bloque la sauvegarde de l'entrée IRL).

#### 3. Validation cohérence renforcée (`useCCCFormState.ts → getMissingFields`)
- Calculer `rentalConstructionRefs = ['main' si Location, ...additional.filter(Location).map(id => 'additional:'+id)]`.
- Calculer `irlRefs = taxRecords.filter(IRL).map(t => t.constructionRef)`.
- Erreurs détaillées :
  - **Manquants** : `rentalConstructionRefs` non couverts par `irlRefs` → message « IRL manquant pour : Construction principale, Construction #2 ».
  - **Orphelins** : IRL avec `constructionRef` qui n'existe plus / n'est plus en Location → message « IRL orphelin à supprimer ».
  - **Doublons** : 2 IRL pour la même construction → message « 2 IRL pour la même construction ».
- Bloquer la soumission tant que la couverture n'est pas exacte (1 IRL ↔ 1 construction Location).

#### 4. Auto-purge cohérence
- Effet existant qui purge IRL si plus aucune Location → étendre :
  - Si une construction additionnelle passe de Location à autre chose : purger les IRL avec `constructionRef === 'additional:<id>'` correspondant + toast informatif.
  - Si une construction additionnelle est supprimée : idem.

#### 5. Récapitulatif (ReviewTab)
- Bloc « Cohérence IRL » : afficher la liste détaillée par construction :
  - ✅ Principale (Résidentielle, 2010) → IRL 2024 renseigné
  - ❌ Construction #2 (Commerciale, 2015) → IRL manquant
- Lien « Aller à l'onglet Obligations ».

#### 6. Persistance
- Le champ `constructionRef` est stocké dans le JSONB `tax_history` (rétrocompatible, pas de migration SQL).
- Pour les fiches existantes sans `constructionRef`, considérer comme rattachées à `main` par défaut.

### Fichiers à modifier
- `src/hooks/useCCCFormState.ts` (validation, purge, dérivés)
- `src/components/cadastral/ccc-tabs/ObligationsTab/...` (form taxe : sélecteur Construction)
- `src/components/cadastral/ccc-tabs/ReviewTab.tsx` (bilan détaillé par construction)
- `src/types/...` (TaxRecord.constructionRef)

### Validation E2E
- 1 principale (Habitation) + 2 additionnelles (Location, Location) → IRL apparaît dans picklist, sélecteur Construction propose les 2 additionnelles, bloque tant que les 2 ne sont pas couvertes.
- Passer 1 additionnelle en Habitation → IRL associé purgé automatiquement, toast affiché.
- Récap affiche statut par construction.
- Soumission bloquée si 1 construction Location sans IRL.

