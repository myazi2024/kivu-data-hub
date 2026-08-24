# Préchargement du numéro de recherche dans le formulaire CCC

## Situation actuelle (vérifiée)

- La barre de recherche de `/cadastral-map` a désormais deux modes : **N° de parcelle (SU/SR)** et **N° de titre de propriété**.
- Quand aucune parcelle ne correspond, le bouton « Ajouter cette parcelle » ouvre le formulaire CCC en lui passant **uniquement** `parcelNumber = searchQuery` — donc, si la recherche s'est faite par numéro de titre, c'est le numéro de titre qui est injecté comme numéro de parcelle. C'est le bug à corriger.
- Le numéro de parcelle n'est **jamais saisissable** dans le formulaire : il vient du prop, sert de clé de brouillon (`cadastral_contribution_<parcelNumber>`) et sert à auto-détecter la zone (préfixe SU/SR → boutons verrouillés).
- Le bloc « Zone urbaine ou Zone rurale ? » (onglet Localisation) ne contient que les deux boutons SU/SR, sans champ de numéro.
- Le numéro de titre se saisit dans l'onglet Infos (`Type de titre de propriété` → `N° du titre`), champ `titleReferenceNumber`.

## Ce qui sera fait

### 1. Transmettre le contexte de recherche au formulaire

La carte passera au formulaire, en plus du texte cherché, **le mode utilisé** :
- Recherche par **N° de parcelle** → le numéro est traité comme numéro SU/SR (comportement actuel conservé).
- Recherche par **N° de titre** → le texte est préchargé dans l'onglet Infos comme **numéro du titre de propriété**, et le numéro de parcelle reste vide, à saisir par l'utilisateur.

Le type de titre n'étant pas déductible de la recherche, il reste à choisir par l'utilisateur ; un message discret sous le champ indiquera que le numéro provient de sa recherche et qu'il doit sélectionner le type correspondant.

### 2. Nouvelle case « Numéro de la parcelle » sous les boutons SU/SR

Dans l'onglet Localisation, bloc « Localisation de la parcelle », sous les boutons SU - Urbaine / SR - Rurale :
- Le champ n'apparaît qu'après le choix d'une zone ; son libellé et son exemple s'adaptent (« N° de la section urbaine (SU) » / « N° de la section rurale (SR) »).
- Il est **auto-rempli** avec le numéro SU/SR de la recherche infructueuse lorsque la recherche s'est faite en mode parcelle, et reste **modifiable**.
- Il est **vide et obligatoire** lorsque la recherche s'est faite par numéro de titre.
- Changer de zone (SU ↔ SR) ajuste le préfixe attendu ; un numéro déjà saisi incompatible avec la zone est signalé (message de validation), pas effacé silencieusement.
- La saisie applique la même validation de caractères que la barre de recherche standard (chiffres, S, U, R, `.` `/`), et le numéro est normalisé en majuscules.

### 3. Cohérence avec la logique existante

- L'auto-détection de zone depuis le numéro reste active : si le numéro (préchargé ou saisi) commence par SU/SR, la zone se sélectionne automatiquement ; les boutons ne sont verrouillés que quand le numéro vient réellement d'une recherche parcelle.
- Le numéro saisi dans ce champ devient la source de vérité pour l'enregistrement, le récapitulatif, la validation, l'anti-doublon et la soumission.
- L'onglet Localisation ne peut plus être validé sans numéro de parcelle valide (message clair et lien vers le champ).

## Détails techniques

- `src/pages/CadastralMap.tsx` : passer `searchMode` (et `initialTitleNumber`) à `CadastralIntroDialog` / `CadastralContributionDialog` ; en mode titre, `parcelNumber` transmis vide.
- `src/components/cadastral/CadastralContributionDialog.tsx` : nouveaux props optionnels `initialTitleReferenceNumber` et `searchOrigin: 'parcel' | 'title'`, transmis à `useCCCFormState`.
- `src/hooks/useCCCFormState.ts` :
  - `formData.parcelNumber` devient éditable via `handleInputChange('parcelNumber', …)` ; initialisation depuis le prop.
  - Préchargement de `titleReferenceNumber` quand `searchOrigin === 'title'`.
  - Clé de brouillon : basée sur le numéro fourni à l'ouverture (ou `draft` si vide) afin de ne pas casser la restauration en cours de saisie ; migration de la clé si le numéro est renseigné ensuite.
  - `sectionTypeAutoDetected` ne se déclenche que sur un préfixe SU/SR ; l'effet d'auto-détection écoute désormais `formData.parcelNumber`.
- `src/components/cadastral/ccc-tabs/LocationTab.tsx` (+ sous-composant `ParcelNumberField.tsx`) : champ contrôlé sous les boutons de zone, sanitation majuscules, aide contextuelle, marqueur d'obligation.
- `src/hooks/useFormValidation.ts` : règle « numéro de parcelle requis / préfixe cohérent avec la zone » rattachée à l'onglet Localisation.
- `src/components/cadastral/ccc-tabs/ReviewTab.tsx` : affiche le numéro de parcelle saisi.
- Aucune migration de base : `parcel_number` et `title_reference_number` existent déjà.

## Hors périmètre

- Pas de changement des règles de tarification ni du flux d'approbation.
- Pas de modification de la recherche avancée.
