

## Plan : "Location" dans CCC → date de mise en location + IRL conditionnel

### Exploration ciblée requise
Avant implémentation, je dois identifier :
1. Le bloc Construction de l'onglet Infos (champ `usage` / `declared_usage`).
2. `AdditionalConstructionBlock` (constructions additionnelles).
3. Le sous-onglet Taxes de l'onglet Obligations (sélection des types de taxes).
4. L'onglet Envoi/Récapitulatif (logique fiscale IRL).
5. Le state CCC central (`useCCCFormState`) pour stockage de la nouvelle date et propagation cross-onglets.

### 1. Onglet Infos — Construction principale
- Sous le champ `usage` (onglet déclaré), si `usage === 'Location'` :
  - Afficher un champ **« En location depuis quand ? »** (Shadcn Datepicker, `pointer-events-auto`).
  - Validation : `rentalStartDate ≤ constructionYear` (au 31 déc. de l'année de construction). Message d'erreur clair si saisie postérieure.
  - Date max = aujourd'hui ; date min = année de construction (1er janv.).
  - Champ obligatoire si `usage === 'Location'` ; bloque la validation de l'onglet sinon.
- Stockage : nouveau champ `rental_start_date` (ISO) dans le state de la construction principale → persisté dans `cadastral_parcels` (colonne à ajouter via migration) ou dans le JSONB déjà utilisé pour les attributs de construction.

### 2. Onglet Infos — Constructions additionnelles
- Réplication exacte dans `AdditionalConstructionBlock` :
  - Même champ conditionnel + même règle de validation par construction.
  - Stockage dans le JSONB `additional_constructions` (champ `rental_start_date` par item).
- Utiliser `resolveAvailableUsages` (déjà partagé) → aucune divergence d'options.

### 3. Onglet Obligations — Sous-onglet Taxes
- Calcul d'un flag dérivé `hasAnyRentalUsage` :
  - `true` si construction principale OU au moins une construction additionnelle a `usage === 'Location'`.
- Dans la liste des types de taxes :
  - **« Impôt sur le revenu locatif » (IRL)** visible/sélectionnable **uniquement si** `hasAnyRentalUsage === true`.
  - Sinon : option masquée + tooltip explicatif (« Disponible si au moins une construction est en location »).
  - Si l'utilisateur désélectionne « Location » après avoir ajouté un IRL → purger automatiquement les entrées IRL du state (avec `toast` informatif).
- Aligner avec `mem://features/cadastral-form/tax-selection-logic-fr` (logique de déduplication IRL existante).

### 4. Onglet Envoi/Récapitulatif — Cohérence IRL
- Compter `rentalConstructionsCount = (main usage === Location ? 1 : 0) + additional.filter(usage === Location).length`.
- Compter `irlEntriesCount` dans l'historique fiscal.
- Afficher un **bilan IRL** dans le bloc fiscal récap :
  - Si `irlEntriesCount < rentalConstructionsCount` → alerte rouge « X construction(s) en location sans IRL renseigné ».
  - Si `irlEntriesCount > rentalConstructionsCount` → alerte ambre « Trop d'entrées IRL par rapport au nombre de constructions en location ».
  - Si égalité → check vert.
- Bloquer la soumission si `irlEntriesCount !== rentalConstructionsCount` (cohérence stricte demandée).
- Étendre le bloc « Bilan de conformité fiscale 3 ans » existant (cf. `mem://features/cadastral-form/fiscal-review-logic-fr`).

### 5. Persistance & rétrocompatibilité
- Migration : ajouter `rental_start_date DATE` dans `cadastral_parcels` (construction principale).
- `additional_constructions` JSONB : nouveau champ `rental_start_date` par item (rétrocompatible, pas de migration).
- Pas d'impact sur les fiches existantes : champ optionnel sauf si `usage === 'Location'`.
- Mettre à jour `CadastralDocumentView` (section Construction) pour afficher la date de mise en location quand renseignée.

### 6. Validation E2E
- Sélectionner `Location` → datepicker apparaît, refuse une date > année construction, exige une saisie.
- Ajouter une 2e construction `Location` avec sa propre date.
- Onglet Obligations → IRL devient sélectionnable, ajouter 2 entrées IRL.
- Récap → bilan vert.
- Désélectionner `Location` sur une construction → IRL associé purgé + alerte cohérence si reste mal aligné.
- Soumission bloquée tant que `IRL count ≠ rental constructions count`.

### Fichiers à modifier (estimation après exploration)
- `src/components/cadastral/CadastralContributionDialog/...` (onglet Infos, bloc Construction principale)
- `src/components/cadastral/CadastralContributionDialog/AdditionalConstructionBlock.tsx`
- `src/components/cadastral/CadastralContributionDialog/...` (onglet Obligations / Taxes)
- `src/components/cadastral/CadastralContributionDialog/ReviewTab.tsx` (récap fiscal)
- `src/hooks/useCCCFormState.ts` (state central + dérivés `hasAnyRentalUsage`, compteurs)
- `src/utils/declaredUsageNormalizer.ts` (aucun changement, déjà compatible)
- Migration SQL : `cadastral_parcels.rental_start_date DATE NULL`
- `src/components/cadastral/cadastral-document/sections/ConstructionSection.tsx` (affichage lecture)

