# « Fiche parcellaire » reste sélectionnable après une recherche SU/SR infructueuse

## Cause

La règle métier existe déjà, mais elle ne se déclenche que si le numéro préchargé commence littéralement par « SU » / « SR » (`/^S\s*[UR]\s*[0-9]/`) ou si la zone a été verrouillée par cette même détection (`src/hooks/useCCCFormState.ts:1295-1300, 1545-1548`).

Or la barre de recherche transmet la saisie brute de l'utilisateur (`src/pages/CadastralMap.tsx:829`). Si la recherche a été lancée avec seulement les chiffres (ex. « 12345 »), sans taper le préfixe, aucun « SU »/« SR » n'est détecté : le drapeau reste faux et « Fiche parcellaire » demeure sélectionnable.

## Correction

1. **L'origine de la recherche fait foi.** Quand le formulaire est ouvert depuis une recherche en mode « N° parcelle (SU/SR) » avec un numéro non vide, la parcelle est considérée comme portant un numéro SU/SR — que le préfixe ait été tapé ou non. « Fiche parcellaire » est alors désactivé dans le picklist, avec la note explicative déjà prévue.

2. **Normalisation du numéro préchargé.** Le numéro venu de la recherche est nettoyé (préfixe éventuel retiré, chiffres conservés). S'il portait déjà « SU » ou « SR », la zone urbaine/rurale reste détectée et verrouillée comme aujourd'hui. S'il n'y avait pas de préfixe, l'utilisateur choisit SU-Urbaine / SR-Rurale et le préfixe est appliqué automatiquement au champ de l'onglet Localisation (comportement existant).

3. **Cohérence des champs.** Le bloc « Numéro de la parcelle » reste demandé dans ce parcours, et le nettoyage automatique d'une sélection « Fiche parcellaire » déjà faite continue de s'appliquer (hors mode édition d'une contribution existante).

## Détails techniques

- `src/hooks/useCCCFormState.ts` :
  - `hasSuSrParcelNumber` devient `searchOrigin === 'parcel' && !!parcelNumber?.trim()` **ou** le test regex actuel **ou** `sectionTypeAutoDetected` ;
  - `isParcelNumberRequired` s'appuie sur `hasSuSrParcelNumber` plutôt que sur le seul `sectionTypeAutoDetected`, pour ne jamais masquer un numéro déjà connu ;
  - initialisation de `formData.parcelNumber` : passage par `stripParcelPrefix` / `composeParcelNumber` lorsque le préfixe est présent, valeur nettoyée sinon.
- Aucun changement dans `PropertyTitleTypeSelect.tsx`, `GeneralTab.tsx` ni `CadastralContributionDialog.tsx` : la prop `disallowFicheParcellaire` est déjà branchée sur `state.hasSuSrParcelNumber`.
- Aucune migration de base de données, aucun changement de tarification ni de workflow d'approbation.
