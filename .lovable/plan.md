## Objectif

Quand `declaredUsage === 'Location'` dans le bloc Construction (onglet Infos), ajouter deux nouveaux indicateurs, puis aligner l'onglet Obligations (IRL) sur le nombre de locaux déclarés. Appliquer la même logique pour la construction principale **et** les constructions additionnelles (`AdditionalConstructionBlock`), pour conserver la cohérence du formulaire et de l'IRL (1 IRL ↔ 1 construction louée, désormais multi-locaux).

## 1. Nouveaux champs (onglet Infos → bloc Construction)

Insertion conditionnelle à `declaredUsage === 'Location'`, dans `GeneralTab.tsx` et `AdditionalConstructionBlock.tsx`.

### A. Configuration locative (après "En location depuis quand ?")

- Libellé reformulé : **« Comment ce bien est-il mis en location ? »**
- Sous-texte : « Le bien est-il loué comme un seul local à un unique locataire, ou divisé en plusieurs locaux loués séparément ? »
- Type : sélecteur (radio cards 2 options) → champ `rentalConfiguration`:
  - `single` → libellé : « Un seul local (un locataire) »
  - `multi` → libellé : « Divisé en plusieurs locaux loués séparément »
- Si `multi` : afficher un input numérique `rentalUnitsCount` (min 2, max 50), libellé : « Nombre de locaux mis en location ».

### B. Loyer mensuel (après "Capacité d'accueil")

- Libellé : **« Loyer mensuel actuel (USD) »**
- Si `rentalConfiguration === 'single'` (ou non défini) : un seul champ numérique `monthlyRentUsd`.
- Si `rentalConfiguration === 'multi'` : générer `rentalUnitsCount` cartes (`rentalUnits: Array<{ label?: string; monthlyRentUsd?: number }>`), une par local :
  - Label par défaut : « Local #1 », « Local #2 »…
  - Champ libre `label` (optionnel) + champ numérique `monthlyRentUsd` (requis).
  - Synchronisation : si l'utilisateur change `rentalUnitsCount`, ajuster la longueur du tableau (préserver les valeurs existantes ; vider les surplus).
- Total mensuel affiché en bas, et total annuel (× 12) pour information.

## 2. Logique dépendante & invariants

- Si `declaredUsage` quitte « Location » → reset `rentalConfiguration`, `rentalUnitsCount`, `monthlyRentUsd`, `rentalUnits`, et `rentalStartDate` (déjà existant).
- Si `rentalConfiguration` passe `multi → single` → conserver seulement le 1er loyer comme `monthlyRentUsd`, vider `rentalUnits` et `rentalUnitsCount`.
- Si `rentalConfiguration` passe `single → multi` avec `monthlyRentUsd` saisi → seed `rentalUnits[0].monthlyRentUsd = monthlyRentUsd`, défaut `rentalUnitsCount = 2`.
- Validation soumission CCC (`useFormValidation.ts`) : si Location, exiger `rentalConfiguration` + (`monthlyRentUsd > 0` OU tous les `rentalUnits[i].monthlyRentUsd > 0`) + cohérence longueur tableau / `rentalUnitsCount`.
- Inclure les nouveaux champs dans `DRAFT_SAFE_FIELDS` (`useFormPersistence.ts`) et dans le score de complétude.

## 3. Onglet Obligations — IRL

Dans `ObligationsTab.tsx` :

- Le picklist `Construction concernée` (IRL) reste 1 entrée par construction louée — inchangé.
- Sous le sélecteur, afficher un rappel contextuel calculé à partir de la construction sélectionnée :
  - `single` → « 1 local en location · loyer mensuel: X USD · annuel estimé: 12·X USD ».
  - `multi` → « N locaux en location · total mensuel: ΣX USD · annuel estimé: 12·ΣX USD », avec une mini-liste des locaux.
- Lors du déclenchement du `IRLCalculator` pour cette construction : pré-remplir les `tenants` à partir de `rentalUnits` (1 tenant par local, `unitName = label`, `monthlyRentUsd = saisi`). Si `single`, créer 1 tenant unique. L'utilisateur reste libre d'ajuster.
- Le sélecteur d'année et le blocage « déjà déclarée » restent inchangés.

## 4. Persistance & Backend

- Ajouter à `CadastralContributionData` (interface principale et entrée du tableau `additionalConstructions`) :
  - `rentalConfiguration?: 'single' | 'multi'`
  - `rentalUnitsCount?: number`
  - `monthlyRentUsd?: number`
  - `rentalUnits?: Array<{ label?: string; monthlyRentUsd?: number }>`
- `buildContributionPayload` : sérialiser ces champs dans `permit_request_data`-style JSON ? Non — préférer une **migration** ajoutant 4 colonnes dédiées à `cadastral_contributions` :
  - `rental_configuration text` (CHECK in `('single','multi')`)
  - `rental_units_count integer`
  - `monthly_rent_usd numeric`
  - `rental_units jsonb` (`[{label, monthly_rent_usd}]`)
- Trigger CCC → `cadastral_parcels` : propager `rental_configuration`, `rental_units_count`, `monthly_rent_usd`, `rental_units` (colonnes parallèles à créer côté parcelle pour réutilisation IRL).
- Mapping admin (`CCCDetailsDialog.tsx`, `ReviewTab.tsx`, `ConstructionSection.tsx` du PDF) : afficher les nouvelles infos.

## 5. UI/UX

- Réutiliser les classes existantes (`rounded-2xl`, `bg-primary/10`, `h-10 rounded-xl text-sm`).
- Animation `animate-fade-in` à l'apparition des cartes locataires.
- Mobile-first (le formulaire est rendu en 360 px).
- Reformulations professionnelles appliquées (cf. libellés ci-dessus).

## 6. Vérification

- Compilation TS ; tests existants `useFormValidation` à étendre (cas Location single/multi).
- Test manuel : usage = Location → bascule single/multi, modification de `rentalUnitsCount`, soumission, ouverture IRL pré-rempli.
- Pas de régression sur les autres usages (`Habitation`, `Commerce`, etc.).

## Fichiers modifiés (estimés)

- `src/hooks/useCadastralContribution.tsx` — interface + payload + colonnes
- `src/hooks/useCCCFormState.ts` — reset/cascade des nouveaux champs
- `src/hooks/ccc/useFormValidation.ts` — règles validation
- `src/hooks/ccc/useFormPersistence.ts` — DRAFT_SAFE_FIELDS
- `src/components/cadastral/ccc-tabs/GeneralTab.tsx` — UI Configuration + Loyer (construction principale)
- `src/components/cadastral/AdditionalConstructionBlock.tsx` — UI miroir pour constructions additionnelles
- `src/components/cadastral/ccc-tabs/ObligationsTab.tsx` — rappel multi-locaux sous IRL
- `src/components/cadastral/IRLCalculator.tsx` (+ `IRLTenantsList.tsx`) — pré-remplissage tenants
- `src/components/cadastral/ccc-tabs/ReviewTab.tsx` — affichage récap
- `src/components/cadastral/cadastral-document/sections/ConstructionSection.tsx` — PDF
- `src/components/admin/ccc/CCCDetailsDialog.tsx` + `types.ts` — vue admin
- Migration SQL : `cadastral_contributions` + `cadastral_parcels` + trigger sync
