# Numéro SU/SR : préfixe automatique et dépendance au type de titre

## 1. Préfixe SU/SR figé et automatique

Dans l'onglet Localisation → « Localisation de la parcelle », le champ « Numéro de la parcelle » devient un champ à préfixe visible :

```text
[ SU ]  12345
[ SR ]  12345
```

- Le badge « SU » ou « SR » est affiché à gauche du champ, non modifiable, et suit le choix « SU - Urbaine » / « SR - Rurale ».
- L'utilisateur ne saisit que la partie après le préfixe (chiffres, `.`, `/`).
- Si l'utilisateur colle une valeur contenant déjà « SU » ou « SR », le préfixe est retiré automatiquement de la saisie (pas de doublon).
- La valeur enregistrée reste complète (« SU 12345 »).
- Le message d'alerte « Le numéro doit commencer par SU… » disparaît : il ne peut plus se produire.
- Changement de zone urbaine ↔ rurale : le préfixe suit le nouveau choix, la partie numérique saisie est conservée.

## 2. Champ dépendant du type de titre

Le bloc « Numéro de la parcelle » ne s'affiche que si, dans l'onglet Infos, le type de titre est :
- « Certificat d'enregistrement », ou
- « Contrat de location (Contrat d'occupation provisoire) », ou
- « Autre ».

Pour « Fiche parcellaire », le champ est masqué et n'est plus exigé pour passer à l'onglet suivant ni pour soumettre.

Comme le numéro de parcelle reste la clé d'identification côté base, lorsque le champ est masqué la référence utilisée est le numéro du titre saisi dans l'onglet Infos (« Numéro du titre »). Si ce numéro est vide, la soumission signale « Numéro du titre (Fiche parcellaire) » comme champ manquant, dans l'onglet Infos — l'utilisateur n'est jamais bloqué sans indication claire.

Si le numéro de parcelle provient d'une recherche cadastrale SU/SR (champ verrouillé), il reste affiché même en « Fiche parcellaire », puisque la parcelle est déjà identifiée.

## Détails techniques

- `src/components/cadastral/ccc-tabs/shared/ParcelNumberField.tsx` :
  - rendu en groupe préfixe + `Input` (badge `bg-muted text-muted-foreground`, tokens sémantiques, `aria-label` sur le champ) ;
  - `sanitize` limité à `[0-9./ ]` après suppression d'un éventuel préfixe saisi ;
  - `onChange` renvoie toujours `${prefix} ${suffixe}` ;
  - suppression du bloc d'erreur « prefixMismatch ».
- `src/components/cadastral/ccc-tabs/LocationTab.tsx` : rendre `<ParcelNumberField>` uniquement si `formData.propertyTitleType !== 'Fiche parcellaire'` ou si le numéro vient d'une recherche (`sectionTypeAutoDetected`).
- `src/hooks/ccc/useFormValidation.ts` : conditionner les trois règles `parcelNumber` (longueur, préfixe SU, préfixe SR) au même critère ; pour « Fiche parcellaire » sans numéro verrouillé, exiger `titleReferenceNumber` (onglet `general`).
- `src/hooks/useCCCFormState.ts` : à la soumission, si le champ est masqué, alimenter `parcelNumber` avec `titleReferenceNumber` ; réappliquer le préfixe à `parcelNumber` lors d'un changement de `sectionType`.
- Aucune migration de base de données ; aucun changement de tarification ou de workflow d'approbation.
