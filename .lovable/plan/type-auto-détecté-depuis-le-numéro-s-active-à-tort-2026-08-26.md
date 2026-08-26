# « Type auto-détecté depuis le numéro » s'active à tort

## Cause (vérifiée)

L'effet d'auto-détection (`src/hooks/useCCCFormState.ts:1294-1300`) regarde la valeur **courante** du champ `formData.parcelNumber` et verrouille la zone dès qu'elle commence par SU/SR, à condition que le formulaire vienne d'une recherche par n° de parcelle (`parcelNumber` non vide).

Or, dès que l'utilisateur coche « SU - Urbaine » ou « SR - Rurale », `handleSectionTypeChange` (`:270-280`) recompose le numéro avec le préfixe (`composeParcelNumber`). Le numéro devient donc « SU 12345 » alors que l'utilisateur n'a jamais tapé de préfixe — l'effet croit à une détection et affiche « Type auto-détecté depuis le numéro » en verrouillant les deux boutons.

## Correction

1. **La détection ne se base plus que sur le numéro réellement reçu de la recherche.** Si le numéro transmis par la barre de recherche cadastrale porte un préfixe SU/SR, la zone est déduite et verrouillée (comportement voulu). S'il n'en porte pas, la zone reste libre et le badge « Type auto-détecté depuis le numéro » ne s'affiche pas — même après que le préfixe a été appliqué automatiquement par le choix de zone.

2. **La saisie manuelle d'un préfixe reste utile mais non verrouillante.** Si l'utilisateur colle lui-même « SU 12345 » dans le champ, la zone se positionne automatiquement sur Urbaine mais les boutons restent cliquables (il peut corriger).

3. **Aucun impact sur la règle « Fiche parcellaire ».** L'incompatibilité reste pilotée par `hasSuSrParcelNumber`, qui s'appuie déjà sur l'origine de la recherche (`searchOrigin === 'parcel'`) et non sur le drapeau d'auto-détection ; on retire simplement `sectionTypeAutoDetected` de ce calcul pour éviter une dépendance circulaire.

## Détails techniques

- `src/hooks/useCCCFormState.ts` :
  - le calcul « verrouillable » devient un test du **prop initial** : `/^S\s*[UR]/i.test(parcelNumber ?? '')`, au lieu de `!!parcelNumber?.trim()` ;
  - l'effet continue de positionner `sectionType` depuis la valeur courante, mais ne passe `sectionTypeAutoDetected` à `true` que dans ce cas ;
  - `hasSuSrParcelNumber` conserve `searchOrigin === 'parcel' && numéro non vide` + test regex, sans `sectionTypeAutoDetected`.
- Aucun changement dans `LocationTab.tsx`, `ParcelNumberField.tsx` ni côté base de données.
