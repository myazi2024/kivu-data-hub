

# Aligner les blocs demandeur/propriétaire du formulaire Titre Foncier sur le bloc Propriétaire CCC

## Constat

Le bloc "Propriétaire actuel" du formulaire CCC (GeneralTab.tsx) possède une logique de dépendance riche selon le statut juridique :

| Statut juridique | Champs conditionnels |
|---|---|
| **Personne physique** | Genre, Nom, Post-nom, Prénom |
| **Personne morale** | Type d'entreprise (Société/Association) → Forme juridique ou Type d'association → Raison sociale/Dénomination + N° RCCM/Arrêté |
| **État** | Type de droit (Concession/Affectation) → Libellé adapté |

Le formulaire Titre Foncier (`LandTitleRequestDialog.tsx`) utilise des blocs simplifiés sans ces dépendances :

- **Bloc demandeur** (3 endroits : parcel-linked representative/beneficiary ~L1524, standard mode ~L1677, standard representative/beneficiary ~L1524) : statut juridique plat (Personne physique/Société/Association/État) avec les mêmes champs Nom/Prénom/Post-nom quel que soit le statut — pas de Raison sociale, RCCM, type d'entreprise, etc.
- **Bloc propriétaire** (~L1782) : encore plus simplifié (Personne physique/Personne morale/Indivision) — valeurs de picklist incorrectes et aucun champ conditionnel.

## Modifications

### 1. Fichier : `src/components/cadastral/LandTitleRequestDialog.tsx`

**a) Bloc demandeur (standard mode, ~L1677-1776)** :
- Remplacer les valeurs du picklist Statut juridique par : `Personne physique`, `Personne morale`, `État` (aligner sur CCC)
- Quand `Personne morale` : afficher les champs conditionnels identiques au CCC :
  - Type d'entreprise (Société/Association)
  - Forme juridique (si Société) ou Type d'association (si Association)
  - Raison sociale/Dénomination au lieu de "Nom"
  - N° RCCM / N° Arrêté au lieu de "Prénom"
  - Masquer Post-nom
- Quand `État` : afficher Type de droit (Concession/Affectation) et adapter les labels
- Quand `Personne physique` : garder Genre + Nom/Post-nom/Prénom (comme actuellement)

**b) Bloc demandeur (parcel-linked mode representative/beneficiary, ~L1524-1620)** :
- Appliquer la même logique conditionnelle que ci-dessus

**c) Bloc propriétaire (~L1794-1874)** :
- Remplacer les valeurs du picklist : `Personne physique`, `Personne morale`, `État` (au lieu de Personne physique/Personne morale/Indivision)
- Ajouter les mêmes champs conditionnels (type d'entreprise, forme juridique, raison sociale, etc.)

**d) Nouveaux champs de state** :
- Ajouter dans `formData` : `requesterEntityType`, `requesterEntitySubType`, `requesterEntitySubTypeOther`, `requesterRightType`, `ownerEntityType`, `ownerEntitySubType`, `ownerEntitySubTypeOther`, `ownerRightType`
- Reset ces champs quand le statut juridique change

### 2. Fichier : `src/hooks/useLandTitleRequest.tsx`

- Ajouter les nouveaux champs au type `LandTitleRequestData`
- Inclure les champs dans l'objet d'insertion Supabase (en tant que `additional_documents` JSON ou colonnes dédiées si elles existent)

### 3. Fichier : `src/components/cadastral/LandTitleReviewTab.tsx`

- Afficher les champs conditionnels dans le récapitulatif (type d'entreprise, forme juridique, raison sociale, etc.) au lieu du simple nom/prénom quand le statut juridique n'est pas Personne physique

### 4. Fichier : `src/components/admin/AdminLandTitleRequests.tsx`

- Adapter l'affichage du détail pour inclure les champs conditionnels

### 5. Vérification : colonnes Supabase

- Vérifier si les colonnes `requester_entity_type`, `requester_entity_sub_type`, `requester_right_type`, `owner_entity_type`, etc. existent dans la table `land_title_requests`. Si non, stocker ces données dans le champ JSONB `additional_documents` existant pour éviter une migration.

## Fichiers concernés

| Fichier | Action |
|---|---|
| `src/components/cadastral/LandTitleRequestDialog.tsx` | Champs conditionnels demandeur + propriétaire |
| `src/hooks/useLandTitleRequest.tsx` | Nouveaux champs dans le type + insertion |
| `src/components/cadastral/LandTitleReviewTab.tsx` | Affichage conditionnel résumé |
| `src/components/admin/AdminLandTitleRequests.tsx` | Affichage conditionnel admin |

**Impact** : ~150 lignes modifiées/ajoutées dans 4 fichiers. La logique conditionnelle est copiée depuis GeneralTab.tsx (PersonneMoraleFields, EtatFields) et adaptée au contexte du titre foncier.

