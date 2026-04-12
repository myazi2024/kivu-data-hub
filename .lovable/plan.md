

# Audit Mode Test — Donnees non generees

## Problemes identifies

### Bug 1 : `buildingPermits` — 0 enregistrement (au lieu de ~700)
**Cause** : Contrainte CHECK sur `administrative_status` dans la table `cadastral_building_permits` :
```
CHECK (administrative_status IN ('Conforme', 'En attente', 'Non autorisé'))
```
Le generateur utilise `['Approuvé', 'Rejeté', 'En attente']` — seul `'En attente'` est valide. Les inserts echouent silencieusement.

### Bug 2 : `taxHistory` — 0 enregistrement (au lieu de ~3000)
**Cause** : Contrainte CHECK sur `payment_status` dans la table `cadastral_tax_history` :
```
CHECK (payment_status IN ('pending', 'paid', 'overdue'))
```
Le generateur utilise `'payé'`, `'unpaid'`, `'en_attente'` — aucune de ces valeurs n'est valide sauf `'paid'`. Les inserts echouent silencieusement.

### Bug 3 : Erreurs silencieuses
Les generateurs `generateTaxHistory` et `generateBuildingPermits` utilisent `console.error` sans propager l'erreur. Le `failedSteps` dans le log d'audit affiche `[]` alors que ces etapes ont echoue — l'admin ne voit aucun signal d'echec.

### Bug 4 : Donnees dupliquees
`parcels: 14040` (2x le volume attendu de 7020) et `contributions: 10220` — des generations multiples s'accumulent sans nettoyage prealable. Le bouton "Generer" ne verifie pas si des donnees existent deja.

---

## Plan de correction

### 1. Corriger les valeurs de statut dans les generateurs

**Fichier : `src/components/admin/test-mode/testDataGenerators.ts`**

- `generateBuildingPermits` : remplacer `['Approuvé', 'Rejeté', 'Approuvé', 'En attente', 'Approuvé']` par `['Conforme', 'Non autorisé', 'Conforme', 'En attente', 'Conforme']`
- `generateTaxHistory` : remplacer les cycles `TAX_STATUSES_PAID` et `TAX_STATUSES_UNPAID` par des valeurs conformes au CHECK : `'paid'`, `'pending'`, `'overdue'`

### 2. Ameliorer la remontee d'erreurs

**Fichier : `src/components/admin/test-mode/testDataGenerators.ts`**

- Dans `generateTaxHistory` et `generateBuildingPermits`, ajouter `assertInserted()` ou au minimum propager l'erreur (`throw`) au lieu de `console.error` seul. Cela permet au code appelant dans `useTestDataActions.ts` de capturer l'echec et de l'ajouter a `failedSteps`.

### 3. Ajouter un garde anti-duplication

**Fichier : `src/components/admin/test-mode/useTestDataActions.ts`**

- Dans `generateTestData`, avant de lancer la generation, verifier si des donnees TEST existent deja (via `count_test_data_stats`). Si oui, afficher un avertissement et proposer une regeneration au lieu de generer en double.

### 4. Corriger le runtime error existant

Le build actuel a un `TypeError: Failed to fetch dynamically imported module` sur `Admin.tsx`. Cela est probablement lie a une erreur de syntaxe introduite par les modifications precedentes. Il faut verifier et corriger pour que la page admin charge correctement.

---

## Section technique

**Fichiers modifies :**
- `src/components/admin/test-mode/testDataGenerators.ts` — correction des valeurs CHECK, meilleure propagation d'erreurs
- `src/components/admin/test-mode/useTestDataActions.ts` — garde anti-duplication

**Aucune migration** requise — les contraintes CHECK sont correctes, c'est le code client qui envoie des valeurs non conformes.

