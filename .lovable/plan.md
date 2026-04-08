

# Ajout de "Ayant droit" au picklist Qualité du demandeur + alignement global

## Constat actuel

Le formulaire de demande de titre foncier propose 2 valeurs pour la qualité du demandeur :
- `owner` → "Propriétaire"
- `representative` → "Mandataire"

Il faut ajouter `beneficiary` → "Ayant droit" comme 3e valeur. L'ayant droit (héritier, successeur) n'est pas le propriétaire enregistré : il faut donc collecter les informations du propriétaire séparément, comme pour le mandataire. Cependant, contrairement au mandataire, l'ayant droit n'a pas besoin de procuration mais peut nécessiter un justificatif de droit (déjà couvert par le document de preuve de propriété existant).

## Logique métier

| Qualité | `isOwnerSameAsRequester` | Bloc "Infos propriétaire" | Procuration requise |
|---------|--------------------------|--------------------------|---------------------|
| Propriétaire | `true` | Non | Non |
| Ayant droit | `false` | Oui | Non |
| Mandataire | `false` | Oui | Oui |

## Modifications

### 1. Type TypeScript (`useLandTitleRequest.tsx`)
- Élargir `requesterType`: `'owner' | 'beneficiary' | 'representative'`

### 2. Formulaire (`LandTitleRequestDialog.tsx`)

**Picklist (2 endroits : mode parcel-linked ~L1490 et mode standard ~L1630)** :
- Ajouter le bouton/radio "Ayant droit" (`value="beneficiary"`) entre Propriétaire et Mandataire
- Logique `isOwnerSameAsRequester` : `true` uniquement si `owner`, sinon `false` (ayant droit et mandataire)

**Bloc "Informations du propriétaire" (~L1766)** :
- Afficher aussi quand `requesterType === 'beneficiary'` (actuellement seulement pour `representative`)

**Bloc procuration** :
- Conserver la condition existante : procuration requise uniquement pour `representative`

**Placeholders et labels** :
- Adapter les labels contextuellement : "Informations du mandataire" → "Informations du mandataire" si representative, "Informations de l'ayant droit" si beneficiary, dans les sections du formulaire standard (~L1519 et ~L1661-1760)

### 3. Onglet résumé (`LandTitleReviewTab.tsx`)
- Afficher "Qualité: Ayant droit" dans le récapitulatif (~L196)
- Afficher le bloc propriétaire aussi quand `beneficiary`

### 4. Admin — Détail des demandes (`AdminLandTitleRequests.tsx`)
- Remplacer le `capitalize` brut (~L490) par un mapping : `{ owner: 'Propriétaire', beneficiary: 'Ayant droit', representative: 'Mandataire' }`

### 5. Analytics (`TitleRequestsBlock.tsx` + `analyticsHelpers.ts`)
- Le graphique "Demandeur = Proprio" (~L70) utilise `countBoolean` sur `is_owner_same_as_requester` avec labels "Propriétaire" / "Mandataire"
- Remplacer par un `countBy` sur `requester_type` avec les 3 labels via `FIELD_LABELS`
- Ajouter dans `FIELD_LABELS` : `requester_type: { owner: 'Propriétaire', beneficiary: 'Ayant droit', representative: 'Mandataire' }`
- Adapter le titre du graphique : "Qualité du demandeur" au lieu de "Demandeur = Proprio"

### 6. Données test (`testDataGenerators.ts`)
- Aligner `REQUESTER_TYPES` (~L498) : `['owner', 'beneficiary', 'representative']` (actuellement `['proprietaire', 'mandataire', 'heritier']` — valeurs incorrectes)

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `src/hooks/useLandTitleRequest.tsx` | Type élargi |
| `src/components/cadastral/LandTitleRequestDialog.tsx` | 3e option + logique |
| `src/components/cadastral/LandTitleReviewTab.tsx` | Label + bloc proprio |
| `src/components/admin/AdminLandTitleRequests.tsx` | Mapping label |
| `src/utils/analyticsHelpers.ts` | FIELD_LABELS requester_type |
| `src/components/visualizations/blocks/TitleRequestsBlock.tsx` | countBy au lieu de countBoolean |
| `src/components/admin/test-mode/testDataGenerators.ts` | Valeurs corrigées |

**Impact** : ~40 lignes modifiées dans 7 fichiers. Aucune migration SQL (`requester_type` est un champ `text`).

