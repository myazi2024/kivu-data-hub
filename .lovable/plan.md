

# Audit du mode test — Alignement des données générées

## Problème principal identifié

Le champ **`nationality`** a été ajouté au formulaire CCC (bloc Propriétaire actuel, `current_owners_details` JSONB) mais n'est **pas généré** dans les données test.

## Détail

### 1. `nationality` manquant dans `current_owners_details` (contributions)

**Fichier** : `testDataGenerators.ts`, lignes 328-337

Le JSONB `current_owners_details` dans `generateContributions` ne contient pas `nationality` :
```ts
current_owners_details: [{
  lastName, firstName, middleName, gender, legalStatus, since,
  entityType: '', entitySubType: '', entitySubTypeOther: '',
  stateExploitedBy: '', rightType: '',
  // ❌ nationality MANQUANT
}]
```

Or l'analytics (`TitleRequestsBlock.tsx` ligne 142) fait `countBy(owners, 'nationality')` et le KPI "% Congolais" filtre sur `nationality === 'Congolais (RD)'`. Résultat : **tous les graphiques nationalité affichent 0 / vide** avec les données test.

### 2. Données existantes alignées — Pas d'autre champ manquant

Les autres champs récemment ajoutés (`previousTitleType`, `previousTitleCustomName`) sont des champs optionnels qui n'alimentent pas l'analytics, donc leur absence est acceptable.

### 3. Enrichissement de `entityType` et `rightType`

Ces champs sont toujours vides (`''`) dans les données test, ce qui rend les charts "Type d'entité (pers. morale)" et "Droit de l'État" systématiquement vides. Il faut les peupler conditionnellement selon le `legalStatus`.

### 4. Parcelles — `current_owners_details` absent

La table `cadastral_parcels` (générateur `generateParcels`, ligne 196) n'inclut pas de `current_owners_details`. Ce n'est pas bloquant car les analytics extraient depuis les contributions, mais c'est une incohérence.

## Corrections à apporter

### Fichier modifié (1) : `src/components/admin/test-mode/testDataGenerators.ts`

**A. Contributions — `current_owners_details`** (lignes 328-337) :

Ajouter `nationality` avec distribution réaliste (~80% "Congolais (RD)", ~20% "Étranger") et peupler `entityType`/`rightType` conditionnellement :

```ts
const legalStatus = pick(LEGAL_STATUSES, idx);
const nationality = idx % 5 === 0 ? 'Étranger' : 'Congolais (RD)';
const entityType = legalStatus === 'Personne morale' 
  ? pick(['SARL', 'SA', 'SNC', 'ONG', 'Coopérative'], idx) : '';
const rightType = legalStatus === 'État' 
  ? pick(['Concession', 'Affectation'], idx) : '';

current_owners_details: [{
  ...existant,
  nationality,
  entityType,
  rightType,
}]
```

**B. Parcelles — `current_owners_details`** : Optionnel, non prioritaire.

