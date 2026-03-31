

# Audit du mode test — Bugs, erreurs de logique et optimisations

## Bugs identifiés

### Bug 1 — `MUT_STATUSES[i]` : index out of bounds (crash silencieux)
**Fichier** : `testDataGenerators.ts` ligne 836
**Problème** : `MUT_STATUSES` a 10 éléments, mais `selected` peut avoir jusqu'à 52 entrées. L'accès `MUT_STATUSES[i]` (sans `pick()`) retourne `undefined` pour `i >= 10`, ce qui insère `status: undefined` dans la base.
**Fix** : Remplacer `MUT_STATUSES[i]` par `pick(MUT_STATUSES, i)`.

### Bug 2 — `SUB_STATUSES[i]` : même problème
**Fichier** : `testDataGenerators.ts` ligne 886
**Problème** : `SUB_STATUSES` a 5 éléments, `selected` peut avoir 26 entrées. `SUB_STATUSES[i]` retourne `undefined` pour `i >= 5`.
**Fix** : Remplacer par `pick(SUB_STATUSES, i)`.

### Bug 3 — Payments non batchés : payload trop gros
**Fichier** : `testDataGenerators.ts` lignes 305-311
**Problème** : `generatePayments` insère toutes les factures payées (~100+) en un seul appel, sans batching. Avec 520 parcelles, ~100+ paiements peuvent dépasser les limites de payload.
**Fix** : Ajouter le même pattern de batch de 50.

### Bug 4 — Contributor codes non batchés
**Fichier** : `testDataGenerators.ts` lignes 552-555
**Problème** : ~173 codes CCC insérés en un seul appel, risque similaire.
**Fix** : Batching par 50.

### Bug 5 — Disputes non batchées
**Fichier** : `testDataGenerators.ts` lignes 523-528
**Problème** : 52 litiges insérés d'un coup (acceptable mais inconsistant).
**Fix** : Batching pour cohérence.

### Bug 6 — Rollback : `fraud_attempts` query peut échouer si > 1000 contributions
**Fichier** : `testDataGenerators.ts` ligne 928
**Problème** : La sub-query `supabase.from('cadastral_contributions').select('id').in('parcel_number', parcelNumbers)` peut retourner max 1000 rows (limite Supabase par défaut), mais on a 520 parcelNumbers. Le `.in()` avec 520 valeurs fonctionne, mais le retour est tronqué à 1000.
**Fix** : Ce n'est pas un problème ici car on a 520 contributions (< 1000), mais si le volume augmente, il faudra paginer. Pas de fix immédiat nécessaire.

## Données fictives / texte obsolète

### Problème 7 — Guide mentionne "Générer données de test" (bouton supprimé)
**Fichier** : `TestModeGuide.tsx` ligne 9
**Problème** : Le texte `Utilisez "Générer données de test"` fait référence à un bouton qui n'existe plus (la génération est maintenant automatique à l'activation).
**Fix** : Mettre à jour le texte pour refléter la génération automatique.

## Erreurs de logique

### Problème 8 — Double génération possible
**Fichier** : `AdminTestMode.tsx` lignes 117-124
**Problème** : Si l'admin active le mode test, les données sont générées. S'il clique de nouveau sur "Enregistrer" sans changer la config, `isDirty` est false donc rien ne se passe — c'est correct. Mais si l'admin désactive puis réactive rapidement, il y aura potentiellement des données test existantes ET une nouvelle génération par-dessus, créant des doublons.
**Fix** : Vérifier si `total > 0` avant de lancer `generateTestData()`, ou nettoyer avant de régénérer.

### Problème 9 — Contributions `status: 'pending'` puis update individuel : N+1 queries
**Fichier** : `testDataGenerators.ts` lignes 228-236
**Problème** : Après l'insertion batch, chaque contribution non-pending est mise à jour individuellement (loop await). Avec 520 contributions et ~60% non-pending, cela fait ~312 requêtes séquentielles.
**Fix** : Grouper les updates par statut — une seule requête `.in('id', ids).update({ status })` par statut distinct.

### Problème 10 — `generateServiceAccess` non batché et `flatMap` peut exploser
**Fichier** : `testDataGenerators.ts` lignes 325-339
**Problème** : Peut produire jusqu'à ~200+ records en un seul insert.
**Fix** : Batching par 50.

## Optimisations

### Optimisation 1 — Contribution status updates : batch par statut
Remplacer la boucle N+1 (312 requêtes) par 2-3 requêtes groupées.

### Optimisation 2 — `useTestDataStats` : expertise requests filtrées par `reference_number` et non `parcel_number`
**Fichier** : `useTestDataStats.ts` ligne 25
**Problème mineur** : Le pre-fetch utilise `.ilike('reference_number', 'TEST-%')` ce qui est correct, pas de bug ici.

## Résumé des fichiers à modifier

| Fichier | Corrections |
|---------|-------------|
| `testDataGenerators.ts` | Bugs #1-2 (`pick()` manquant), #3-5 (batching), #9 (N+1 updates groupés), #10 (batching service access) |
| `TestModeGuide.tsx` | #7 (texte obsolète sur le bouton de génération) |
| `AdminTestMode.tsx` | #8 (vérifier `total > 0` avant génération auto) |

