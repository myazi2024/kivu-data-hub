

## Correctif : inverser la règle de validation de la date de mise en location

### Problème
Actuellement dans `RentalStartDateField.tsx` :
- `maxDate = min(today, 31/12/constructionYear)` → la date doit être **≤** année de construction.
- Message : "doit être ≤ 31/12/{constructionYear}".

C'est la règle inverse de la logique réelle : on ne peut pas mettre en location un bien **avant** sa construction. La date de mise en location doit être **≥** année de construction (et ≤ aujourd'hui).

### Correction

Dans `src/components/cadastral/RentalStartDateField.tsx` :

- `minDate` = `1er janvier de constructionYear` (inchangé sur le fond, mais devient la borne basse réelle).
- `maxDate` = `today` (suppression du plafond au 31/12/constructionYear).
- `disabled` du Calendar : `d > today || d < minDate`.
- `isInvalid` : `selected < minDate || selected > today`.
- Message d'aide : « La date doit être ≥ 01/01/{constructionYear} et ≤ aujourd'hui. »
- Message d'erreur : « Date invalide : doit être ≥ 01/01/{constructionYear} (la mise en location ne peut précéder la construction). »

### Propagation
- `src/hooks/useCCCFormState.ts` : si une règle de validation `rentalStartDate ≤ constructionYear` a été ajoutée dans `getMissingFields` ou un effet, l'inverser en `rentalStartDate ≥ constructionYear`.
- `src/components/cadastral/AdditionalConstructionBlock.tsx` : utilise déjà le composant partagé → aucun changement direct sauf si une validation locale a été dupliquée (à vérifier en édition).

### Fichiers
- `src/components/cadastral/RentalStartDateField.tsx` (correctif principal)
- `src/hooks/useCCCFormState.ts` (vérifier/corriger toute validation miroir)

### Validation
- Sélectionner Location, année de construction = 2015 → calendrier autorise du 01/01/2015 à aujourd'hui ; refuse 2014 et antérieur.
- Saisir une date 2010 → erreur explicite affichée.
- Saisir 2020 → accepté.
- Vérifier que le récapitulatif et la soumission ne bloquent plus pour ce motif.

