# Onglet Valeur : message des locaux vacants + IRL non bloquant

## 1. Message d'introduction du bloc « Mise sur le marché des locaux vacants »

Aujourd'hui le message affiche la catégorie du bien (« 1 maison ») au lieu du nom que l'utilisateur a donné au local vacant dans l'onglet Localisation, et il se termine par une question sans dire quoi faire.

Nouveau comportement :
- Reprendre les libellés réels des locaux vacants (le nom/numéro saisi par l'utilisateur, sinon « Local #n · étage », sinon le libellé de la construction).
- Citer ces libellés dans le message, avec troncature au-delà de 3 (« …, et 2 autres »).
- Terminer par une consigne d'action explicite au lieu d'une question ouverte.

Exemples de rendu :
- 1 local : « Vous avez indiqué dans l'onglet Localisation que « Appart 2 » n'est pas occupé. Cochez-le ci-dessous si vous souhaitez le proposer à la location. »
- Plusieurs : « Vous avez indiqué dans l'onglet Localisation que 3 locaux ne sont pas occupés : « Appart 1 », « Appart 2 », « Rez-de-chaussée ». Cochez ci-dessous ceux que vous souhaitez proposer à la location. »

## 2. Impôt sur le revenu locatif (onglet Obligations) : non obligatoire

Actuellement, dès qu'une construction est en location, la validation ajoute un blocage « IRL manquant pour : … » qui empêche de finaliser le formulaire.

Changement : la déclaration IRL devient facultative.
- Supprimer les erreurs bloquantes « IRL manquant ».
- Conserver les contrôles de cohérence sur ce qui est effectivement saisi : IRL orphelin, IRL non rattaché à une construction, doublons d'IRL sur une même construction.
- L'onglet Obligations garde une mention d'information indiquant que la déclaration IRL est recommandée mais optionnelle.

## Détails techniques

- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` : remplacer `totalSubject`/`subjectLabel` par une construction de phrase basée sur `vacantTargets[].label`.
- `src/components/cadastral/ccc-tabs/market-value/marketValueUtils.ts` : ajouter un helper `formatVacantTargetsSentence(targets)` (pur, testable) ; `pluralizeSubject` reste utilisé ailleurs ou est retiré s'il devient inutile.
- `src/hooks/ccc/useFormValidation.ts` (bloc « OBLIGATIONS - IRL × Constructions en location », ~l.321-328) : retirer la boucle `missingRefs` ; garder orphelins, non rattachés et doublons.
- `src/components/cadastral/ccc-tabs/ObligationsTab.tsx` : ajuster le texte d'aide de la section IRL (facultatif).
