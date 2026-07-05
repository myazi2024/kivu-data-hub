# Audit & corrections — recommandations résiduelles CCC

Vérification effectuée : **les 3 recommandations ne sont pas encore intégrées**.

- `GeneralTab.tsx` = 1441 lignes (sous-composants `CurrentOwnersSection`, `ConstructionSection`, `PersonneMoraleFields`, `EtatFields` toujours inline).
- `MarketValueTab.tsx` = 1249 lignes (monolithique).
- `RentalConfigurationFields.selectMode('single')` ne réinitialise ni `isOccupied` ni `hostingCapacity` globaux au passage multi→single (et inversement, la valeur multi précédente peut subsister transitoirement avant que l'agrégation ne reprenne).
- `TabsTrigger disabled` : Radix bloque totalement le clic → aucun feedback utilisateur, l'onglet paraît "cassé".

## 1. Reset explicite occupation au changement de config locative

Fichier : `src/components/cadastral/RentalConfigurationFields.tsx` (fonction `selectMode`).

À chaque changement de mode (`single` ↔ `multi`) et uniquement quand `declaredUsage === 'Location'`, ajouter au patch :

```
isOccupied: undefined,
hostingCapacity: undefined,
occupantCount: undefined,
```

Résultat : plus de valeur transitoire résiduelle. L'agrégation multi repartira à 0 puis se remplira via l'`useEffect` de `GeneralTab`. En single, l'utilisateur ressaisit consciemment.

## 2. Signal utilisateur explicite au clic sur onglet verrouillé

Fichier : `src/components/cadastral/CadastralContributionDialog.tsx`.

- Ajouter un helper local `getFirstLockingTab(tab)` : parcourt `TAB_ORDER` jusqu'à `tab`, retourne le 1er précédent incomplet (via `state.isTabComplete` déjà exposé, ou en dérivant de `getMissingFieldsForTab`).
- Remplacer l'attribut `disabled` par un wrapper : au lieu de `<TabsTrigger disabled>`, garder l'onglet actif mais intercepter `onClick` via un `onPointerDown`/`onClick` guard. Si non accessible :
  - `e.preventDefault(); e.stopPropagation();`
  - `toast({ title: 'Onglet verrouillé', description: 'Complétez d'abord l'onglet « <label> » pour continuer.', variant: 'default' })`.
- Conserver le style visuel verrouillé (opacity-40, `aria-disabled="true"`, `title="Complétez d'abord…"`) mais rendre le trigger cliquable pour capter le clic.
- Récupérer les labels via un mapping local `TAB_LABELS = { location: 'Localisation', history: 'Passé', … }`.

Bénéfice : l'utilisateur mobile comprend immédiatement pourquoi l'onglet ne s'ouvre pas et où agir.

## 3. Modularisation `GeneralTab.tsx`

Créer `src/components/cadastral/ccc-tabs/general/` :

- `CurrentOwnersSection.tsx` — extrait lignes ~410-770 (composant déjà isolé dans le fichier).
- `OwnerFields/PersonneMoraleFields.tsx` — extrait lignes ~772-833.
- `OwnerFields/EtatFields.tsx` — extrait lignes ~834-906.
- `ConstructionSection.tsx` — extrait lignes ~908-fin de section.
- `OccupancyBlock.tsx` — bloc `isOccupied` + `hostingCapacity` (lignes ~1170-1200) + effet d'agrégation multi (lignes 133-150).

Le fichier `GeneralTab.tsx` devient un orchestrateur (< 400 lignes) qui ne fait qu'importer et composer.

Aucun changement de logique métier ni de props publiques. Signatures des sous-composants strictement typées (pas de `as any` supplémentaire).

## 4. Modularisation `MarketValueTab.tsx`

Créer `src/components/cadastral/ccc-tabs/market-value/` :

- `constants.ts` — `SOUND_ENV_LABELS`, `LEASE_TYPE_LABELS`, `CONTACT_LABELS`, `STORAGE_PUBLIC_MARKER`, `MIN_DATE`, `TODAY`.
- `helpers.ts` — `pathFromPublicUrl`, `toUsd`, `dropImage` (factory prenant `removeUploadedPath`), `vacantTargets` builder.
- `ResaleBlock.tsx` — bloc "Proposer à la vente" (prix, description, images, contact).
- `AppraisalBlock.tsx` — bloc "Expertise existante" (valeur, date, rapport uploader).
- `RentalListingsSection.tsx` — cartes par local vacant (contient `RentalListingCard`).
- `RentalListingCard.tsx` — édition d'un listing (loyer, disponibilité, description, images, contact).
- `SoundEnvironmentBlock.tsx` — sélecteur environnement sonore + sources.

Le `MarketValueTab.tsx` reste orchestrateur (~250 lignes) : gestion `useEffect` de recalcul USD, wiring des blocs, mémoisation `vacantTargets`.

Aucun changement de comportement observable. Le rollback Storage granulaire déjà en place est préservé.

## Détails techniques

- Aucune migration Supabase.
- Aucun changement de contrat de props visibles depuis `CadastralContributionDialog` (sauf ajout d'un mapping `TAB_LABELS` local).
- Le toast utilise le hook existant `useToast` déjà importé dans le dialog.
- Pour rendre un `TabsTrigger` verrouillé cliquable : ne pas passer `disabled` à Radix, ajouter `data-locked="true"` + classes d'opacité, intercepter dans un handler `onClick` externe.

## Fichiers modifiés

- `src/components/cadastral/RentalConfigurationFields.tsx`
- `src/components/cadastral/CadastralContributionDialog.tsx`
- `src/components/cadastral/ccc-tabs/GeneralTab.tsx` (allégé)
- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` (allégé)

## Fichiers créés

- `src/components/cadastral/ccc-tabs/general/CurrentOwnersSection.tsx`
- `src/components/cadastral/ccc-tabs/general/OwnerFields/PersonneMoraleFields.tsx`
- `src/components/cadastral/ccc-tabs/general/OwnerFields/EtatFields.tsx`
- `src/components/cadastral/ccc-tabs/general/ConstructionSection.tsx`
- `src/components/cadastral/ccc-tabs/general/OccupancyBlock.tsx`
- `src/components/cadastral/ccc-tabs/market-value/constants.ts`
- `src/components/cadastral/ccc-tabs/market-value/helpers.ts`
- `src/components/cadastral/ccc-tabs/market-value/ResaleBlock.tsx`
- `src/components/cadastral/ccc-tabs/market-value/AppraisalBlock.tsx`
- `src/components/cadastral/ccc-tabs/market-value/RentalListingsSection.tsx`
- `src/components/cadastral/ccc-tabs/market-value/RentalListingCard.tsx`
- `src/components/cadastral/ccc-tabs/market-value/SoundEnvironmentBlock.tsx`

## Hors périmètre

- Pas de changement SQL / RLS / edge functions.
- Pas de refonte du système de validation ni du store CCC.
- Pas d'ajout de nouvelles fonctionnalités métier.
