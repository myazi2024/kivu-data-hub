# Fiche parcellaire incompatible avec un numéro SU/SR

## Règle métier

Une parcelle identifiée par un numéro SU/SR est nécessairement couverte par un certificat d'enregistrement ou un contrat de location (ou un titre « Autre »). Elle ne peut pas être enregistrée sous « Fiche parcellaire ».

## 1. « Fiche parcellaire » non sélectionnable quand un n° SU/SR est connu

Dans l'onglet Infos → Type de titre de propriété :

- Si le formulaire a été ouvert depuis une recherche par n° de parcelle (SU/SR) — cas « Cette parcelle n'existe pas encore » — l'option « Fiche parcellaire » est grisée et non cliquable.
- Même comportement si l'utilisateur a saisi lui-même un numéro SU/SR dans l'onglet Localisation (parcours ouvert depuis une recherche par n° de titre).
- Un court texte explique pourquoi : « Non disponible : une parcelle portant un numéro SU/SR est couverte par un certificat d'enregistrement ou un contrat de location. »
- Si « Fiche parcellaire » avait déjà été choisi avant l'apparition du numéro SU/SR, la sélection est effacée et l'utilisateur est invité à choisir le bon type (aucune donnée de titre saisie n'est perdue : le numéro du titre reste rempli).
- En mode édition d'une contribution existante déjà enregistrée en « Fiche parcellaire », la valeur reste affichée (pas de perte de donnée historique) mais ne peut pas être re-sélectionnée après changement.

## 2. Incohérences liées, corrigées dans la foulée

- **Numéro de parcelle fantôme.** Aujourd'hui, si l'utilisateur saisit un numéro SU/SR puis bascule sur « Fiche parcellaire », le champ est masqué mais la valeur reste en mémoire et part en base. Avec la nouvelle règle ce cas devient impossible ; en sécurité, la valeur masquée est purgée quand le champ n'est pas demandé.
- **Repli du numéro de parcelle à la soumission.** Pour « Fiche parcellaire », `parcel_number` est alimenté par le numéro du titre. On s'assure que cette valeur de repli n'est jamais préfixée SU/SR (sinon elle contredirait le type de titre).
- **Validation cohérente.** Les règles de champs manquants suivent la même condition unique (« le numéro SU/SR est-il demandé ? ») plutôt que trois tests dispersés, pour éviter les messages contradictoires entre onglets.
- **Zone urbaine/rurale.** Quand le numéro vient d'une recherche, le choix SU/SR reste verrouillé ; on vérifie que le type de titre forcé n'entre pas en conflit avec ce verrou.

## Détails techniques

- `src/components/cadastral/PropertyTitleTypeSelect.tsx` : nouvelle prop `disabledValues?: string[]` (+ `disabledReason?: string`) ; `SelectItem` rendu `disabled` avec libellé atténué et note explicative sous le select.
- `src/components/cadastral/ccc-tabs/GeneralTab.tsx` : nouvelle prop `parcelNumberKnown: boolean`, transmise à `PropertyTitleTypeSelect` pour désactiver « Fiche parcellaire » ; effet de nettoyage si la valeur courante devient interdite.
- `src/components/cadastral/CadastralContributionDialog.tsx` : passe l'indicateur calculé depuis l'état (`searchOrigin === 'parcel' && parcelNumber` ou `formData.parcelNumber` non vide, hors mode édition figé).
- `src/hooks/useCCCFormState.ts` : dérivation `isParcelNumberRequired` / `parcelNumberKnown` exposée par le hook ; purge de `parcelNumber` quand le champ n'est pas demandé ; garde sur le repli `titleReferenceNumber` (retrait d'un préfixe SU/SR éventuel).
- `src/hooks/ccc/useFormValidation.ts` : règles `parcelNumber` / `titleReferenceNumber` factorisées sur le même critère.
- `src/components/cadastral/ccc-tabs/LocationTab.tsx` : condition d'affichage alignée sur le même critère partagé.
- Aucune migration de base de données, aucun changement de tarification ni de workflow d'approbation.
