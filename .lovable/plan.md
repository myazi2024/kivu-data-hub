

# Ajout de "Conversion" au picklist Type de demande + alignement global

## Constat

Le picklist du type de demande dans `LandTitleRequestDialog.tsx` ne contient que 2 valeurs (`initial`, `renouvellement`). Le label "Renouvellement d'un titre foncier" doit être raccourci en "Renouvellement". Il faut ajouter "Conversion" comme 3e option et propager ce changement partout.

## Modifications

### 1. Formulaire — Picklist et logique (`LandTitleRequestDialog.tsx`)

- Élargir le type TypeScript de `requestType` : `'initial' | 'renouvellement' | 'conversion' | ''`
- Ajouter `<SelectItem value="conversion">Conversion</SelectItem>` dans le picklist
- Renommer le label "Renouvellement d'un titre foncier" → "Renouvellement"
- Mettre à jour la description du `SectionHelpPopover` pour mentionner les 3 types
- Adapter la logique d'éligibilité (lignes ~2880-2925) : la conversion suit la même logique que l'initial (pas de vérification de titre temporaire)
- Adapter `isParcelLinkedMode` et `isFormBlocked` : la conversion se comporte comme une demande initiale (nécessite fiche parcellaire)

### 2. Hook de soumission (`useLandTitleRequest.tsx`)

- Élargir le type `requestType` dans `LandTitleRequestData` : ajouter `'conversion'`
- La valeur est déjà passée telle quelle à `request_type` en base → aucun changement d'insertion nécessaire

### 3. Onglet de résumé (`LandTitleReviewTab.tsx`)

- Ajouter le cas `conversion` dans le mapping d'affichage (ligne 176) : `'initial' → 'Demande initiale'`, `'renouvellement' → 'Renouvellement'`, `'conversion' → 'Conversion'`

### 4. Admin — Détail des demandes (`AdminLandTitleRequests.tsx`)

- Remplacer le `capitalize` brut (ligne 478) par un mapping de labels : `{ initial: 'Demande initiale', renouvellement: 'Renouvellement', conversion: 'Conversion' }`

### 5. Analytics — Labels des graphiques (`analyticsHelpers.ts`)

- `countBy` affiche les valeurs brutes de la base (`initial`, `renouvellement`, `conversion`). Ajouter un dictionnaire de labels humains dans `countBy` ou dans `TitleRequestsBlock.tsx` pour que le graphique "Type de demande" affiche les bons libellés français.
- Option retenue : ajouter une map `FIELD_LABELS` dans `analyticsHelpers.ts` avec une entrée `request_type` → `{ initial: 'Demande initiale', renouvellement: 'Renouvellement', conversion: 'Conversion' }`, et l'appliquer dans `countBy` quand le champ correspond.

### 6. Données test (`testDataGenerators.ts`)

- Aligner les valeurs générées : remplacer `['nouveau_titre', 'renouvellement', 'duplicata', 'conversion']` par `['initial', 'renouvellement', 'conversion']` pour correspondre aux vraies valeurs du formulaire.

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `src/components/cadastral/LandTitleRequestDialog.tsx` | Ajout 3e option, renommage, logique |
| `src/hooks/useLandTitleRequest.tsx` | Type élargi |
| `src/components/cadastral/LandTitleReviewTab.tsx` | Mapping label |
| `src/components/admin/AdminLandTitleRequests.tsx` | Mapping label |
| `src/utils/analyticsHelpers.ts` | Labels humains dans countBy |
| `src/components/admin/test-mode/testDataGenerators.ts` | Correction valeurs test |

**Impact** : ~30 lignes modifiées dans 6 fichiers. Aucune migration SQL (le champ `request_type` est un `text`).

