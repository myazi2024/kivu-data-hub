

## Plan — Aligner le bloc « Identité du demandeur » sur le bloc « Propriétaire actuel » (CCC)

### Objectif

Dans le formulaire de demande de lotissement, **onglet Parcelle**, remplacer le bloc minimaliste « Identité du demandeur » (5 champs) par un bloc identitaire **structurellement identique** à `CurrentOwnersSection` du formulaire CCC (`GeneralTab.tsx`), pour collecter les mêmes informations légales et garantir la cohérence entre les deux flux.

### Constat de l'existant

| Bloc CCC « Propriétaire actuel » | Bloc Lotissement « Identité du demandeur » |
|---|---|
| Statut juridique (Personne physique / morale / État) | ❌ absent |
| Genre (si physique) | ❌ absent |
| Nom / Post-nom / Prénom | ⚠️ Prénom / Nom / Deuxième prénom (ordre + label différents) |
| Champs Personne morale (RCCM, type entité, sous-type) | ❌ absent |
| Champs État (concession / affectation, exploité par) | ❌ absent |
| Date « Propriétaire depuis » | ❌ absent |
| Nationalité (Congolais / Étranger) | ❌ absent |
| Pièce d'identité / RCCM / Acte (upload) | ⚠️ uploadé séparément à l'étape Docs |
| Mode unique / multiple (copropriétaires) | ❌ N/A — un seul demandeur |
| Téléphone / Email / Qualité (owner / mandatary…) | ✅ présents (spécifique demande) |

### Approche

Réutiliser le composant `CurrentOwnersSection` n'est pas réaliste (couplé à `CadastralContributionData`, `formData.isTitleInCurrentOwnerName`, `titleIssueDate`, `previousTitleType`, `ownerDocFile`, etc., tous propres au CCC). Je vais donc **extraire et adapter** la même structure visuelle et les mêmes champs dans un nouveau composant dédié au demandeur de lotissement, avec :

- **Même ergonomie** (Card, labels, popovers, picklists Supabase via `getPicklistOptions`)
- **Mêmes règles** (Personne physique → genre obligatoire, Personne morale → entityType + RCCM, État → rightType + stateExploitedBy)
- **Champs spécifiques demande conservés** : Téléphone (obligatoire), Email, Qualité du demandeur (Propriétaire / Mandataire / Notaire / Autre)

### Livrables

#### 1. Nouveau type `RequesterInfo` enrichi (`subdivision/types.ts`)

```ts
export interface RequesterInfo {
  // Identité (aligné CurrentOwner)
  legalStatus: 'Personne physique' | 'Personne morale' | 'État' | '';
  gender?: string;
  lastName: string;
  middleName?: string;        // post-nom
  firstName: string;
  // Personne morale
  entityType?: string;
  entitySubType?: string;
  entitySubTypeOther?: string;
  rccmNumber?: string;
  // État
  rightType?: 'Concession' | 'Affectation' | '';
  stateExploitedBy?: string;
  // Commun
  nationality?: 'Congolais (RD)' | 'Étranger' | '';
  // Spécifique demande lotissement
  phone: string;
  email?: string;
  type: 'owner' | 'mandatary' | 'notary' | 'other';
  isOwner: boolean;
}
```

Migration douce du draft local : valeurs par défaut vides pour les nouveaux champs.

#### 2. Nouveau composant `RequesterIdentityBlock.tsx`

Localisation : `src/components/cadastral/subdivision/RequesterIdentityBlock.tsx`

- Rendu calqué sur `CurrentOwnersSection` (même Card, mêmes Selects, mêmes RadioGroups)
- Consomme `getPicklistOptions('picklist_legal_status')`, `'picklist_gender'`, etc. via le hook existant `usePicklistOptions`
- Sous-composants internes `RequesterPersonneMoraleFields`, `RequesterEtatFields` (versions allégées des helpers du CCC, sans champ « Propriétaire depuis » ni `previousTitleType` qui relèvent du titre foncier)
- Bloc « Qualité du demandeur » + Téléphone + Email préservé (champs propres à la demande)
- Validation requise : `legalStatus`, `nationality`, `phone`, `type`, et selon statut : `gender` (physique) / `entityType` + `rccmNumber` (morale) / `rightType` + `stateExploitedBy` (État)

#### 3. Refonte `StepParentParcel.tsx`

Remplacer la `Card` actuelle (lignes 86-157) par `<RequesterIdentityBlock requester={requester} onChange={onRequesterChange} />`.

#### 4. Mise à jour `useSubdivisionForm.ts`

- État initial enrichi (tous les nouveaux champs vides)
- `isStepValid('parcel')` : ajouter règles de validation par statut juridique
- Auto-fill `authUser` : préremplir `legalStatus = 'Personne physique'` par défaut
- Submit (`payload.requester`) : transmettre tous les nouveaux champs

#### 5. Mise à jour edge function `subdivision-request/index.ts`

- Étendre l'interface `requester` avec les nouveaux champs
- Persister dans `subdivision_requests` les colonnes additionnelles

#### 6. Migration BD

Ajouter colonnes à `subdivision_requests` :
- `requester_legal_status text`
- `requester_gender text`
- `requester_entity_type text`
- `requester_entity_subtype text`
- `requester_rccm_number text`
- `requester_right_type text`
- `requester_state_exploited_by text`
- `requester_nationality text`

Toutes nullable (rétrocompatibilité avec les demandes existantes).

#### 7. Affichage admin & récap

- `StepSummary.tsx` : enrichir le bloc « Demandeur » (statut juridique, RCCM si morale, nationalité)
- `AdminSubdivisionRequests.tsx` : afficher les nouveaux champs dans le détail demande

### Détails techniques

- Picklists : réutilisation directe du hook `usePicklistOptions` déjà utilisé dans `CadastralContributionDialog`
- Le bloc « Pièce d'identité » côté CCC reste à l'étape **Docs** du lotissement (déjà géré par `requester_id_document_url`) — pas de duplication d'upload
- Aucun lien avec `titleIssueDate` / `previousTitleType` (ces concepts appartiennent au titre foncier de la parcelle mère, déjà chargée automatiquement)
- Brouillon local : versionner le `localStorage` (clé `subdivision-draft-v2`) pour invalider proprement les anciens drafts incompatibles

### Vérification

1. Ouvrir le formulaire lotissement → onglet Parcelle
2. Le bloc affiche : Statut juridique, Genre, Nom/Post-nom/Prénom, Date, Nationalité — visuellement identique au CCC
3. Basculer sur « Personne morale » → champs Type d'entité + RCCM apparaissent
4. Basculer sur « État » → champs Concession/Affectation + Exploité par apparaissent
5. Téléphone / Email / Qualité du demandeur restent en bas
6. Soumission → toutes les valeurs sont persistées dans `subdivision_requests` et visibles dans l'admin

