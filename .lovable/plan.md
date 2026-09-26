# Autoriser l'IRL d'une même construction sur plusieurs exercices

## Cause
La règle actuelle impose « 1 IRL par construction », sans tenir compte de l'année. Elle bloque à trois endroits :
- le choix « Construction concernée » grise la construction déjà utilisée par un autre IRL (« déjà déclarée ») ;
- l'attribution automatique ignore cette construction pour une nouvelle ligne ;
- la vérification avant envoi signale « 2 IRL déclarés pour la même construction ».

Autre défaut lié : le choix de l'année grise une année « déjà payée » dès qu'un autre IRL de la même année existe, même pour une autre construction.

## Nouvelle règle
Un seul IRL par couple **construction + exercice**. Construction principale 2025 et construction principale 2024 deviennent possibles ; deux fois construction principale 2025 reste refusé.

## Corrections
1. Choix de la construction : ne griser une construction que si elle a déjà un IRL pour la même année (mention « déjà déclarée pour AAAA »).
2. Choix de l'année : pour l'IRL, ne griser une année que si la même construction l'a déjà ; l'impôt foncier garde sa règle.
3. Attribution automatique : proposer la construction principale (ou la première louée) même si elle a déjà un IRL d'une autre année.
4. Vérification avant envoi : remplacer « même construction » par « même construction et même année » (la règle générale type + année + construction existe déjà).
5. Texte d'aide : « 1 IRL par construction louée et par exercice ».

## Détails techniques
- `ObligationsTab.tsx` : `usedRefs` filtré sur `taxYear === tax.taxYear` ; `isBlocked` de l'année inclut `constructionRef` pour l'IRL.
- `useCCCFormState.ts` `updateTaxRecord` : `usedRefs` par année ; si tout est pris, attribuer quand même la première construction louée.
- `useFormValidation.ts` : `refCounts` indexé par `ref|année`.
- Côté base : vérifier au moment de la mise en œuvre qu'aucune contrainte d'unicité ni garde du trigger d'approbation n'écarte le second IRL (base actuellement injoignable) ; ajuster sa clé en ajoutant l'année si besoin.
- Relancer typecheck et tests.
