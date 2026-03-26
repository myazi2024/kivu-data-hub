

# Diagnostic complet du Mode Test — Résultats et orientations

## Résumé de l'audit

L'infrastructure du Mode Test couvre 17 types d'entités avec génération, nettoyage manuel, nettoyage automatique (cron), rollback, statistiques temps réel et progression visuelle. Après les corrections récentes des valeurs fictives, voici les problèmes résiduels et les orientations recommandées.

---

## Problèmes identifiés

### Bug 1 — `current_owner_legal_status` en snake_case (parcelles + contributions)

**Fichier** : `testDataGenerators.ts` L68, L129
**Valeurs actuelles** : `'personne_physique'`, `'personne_morale'`
**Référentiel** (picklist_legal_status) : `'Personne physique'`, `'Personne morale'`, `'État'`
**Impact** : Les graphiques Analytics "Statut juridique" des propriétaires affichent des catégories non reconnues par les normalizers.

### Bug 2 — `generateBoundaryConflicts` est défini mais jamais appelé

**Fichier** : `testDataGenerators.ts` L564-596 (fonction exportée)
**Fichier** : `useTestDataActions.ts` — la fonction n'est ni importée ni invoquée dans le flux de génération.
**Impact** : Les conflits de limites ne sont jamais générés malgré la présence du code. Le rollback les nettoie, mais il n'y a rien à nettoyer.

### Bug 3 — Conflits de limites absents des statistiques

**Fichier** : `useTestDataStats.ts` — aucune requête sur `cadastral_boundary_conflicts`
**Fichier** : `types.ts` — `TestDataStats` n'a pas de champ `boundaryConflicts`
**Fichier** : `TestDataStatsCard.tsx` — pas de ligne d'affichage correspondante
**Impact** : Même si on corrige le Bug 2, les conflits ne seraient pas comptabilisés dans les statistiques affichées.

### Bug 4 — Nettoyage manuel oublie les conflits de limites

**Fichier** : `useTestDataActions.ts` L81-146 — `cleanupTestData` ne supprime pas `cadastral_boundary_conflicts` (contrairement au rollback L807 et au cron edge function L169).
**Impact** : Le bouton "Nettoyer tout" laisse des conflits orphelins en base.

### Bug 5 — `TEST_TABLES_DELETION_ORDER` dans `types.ts` incomplet

Le tableau de référence n'inclut pas `cadastral_boundary_history`, `cadastral_mortgages` ni `cadastral_building_permits` (ajoutés au Bug 17 mais pas reflétés dans ce registre).
**Impact** : Ce tableau n'est pas utilisé directement par le code d'exécution (le cleanup est codé en dur), mais il sert de documentation et pourrait induire en erreur.

### Bug 6 — `requester_legal_status` dans les demandes de titres

**Fichier** : `testDataGenerators.ts` L257, L283, L289
**Valeurs** : `'personne_physique'` (snake_case)
**Vérification** : Ce champ est propre aux demandes de titres (pas un picklist CCC). La DB accepte des valeurs libres. Pas de graphique Analytics impacté actuellement — risque faible, mais incohérent avec la convention Title Case utilisée partout ailleurs.

---

## Orientations recommandées

### Correction immédiate (5 fichiers)

| # | Action | Fichier |
|---|--------|---------|
| 1 | Remplacer `'personne_physique'`/`'personne_morale'` par `'Personne physique'`/`'Personne morale'` (L68, L129) | `testDataGenerators.ts` |
| 2 | Importer et appeler `generateBoundaryConflicts` dans le step 11 (avec les bornages/hypothèques/permis) | `useTestDataActions.ts` |
| 3 | Ajouter `boundaryConflicts` dans `TestDataStats`, `EMPTY_STATS`, et `TEST_TABLES_DELETION_ORDER` (+ ajouter les 3 tables manquantes) | `types.ts` |
| 4 | Ajouter le compteur `cadastral_boundary_conflicts` dans `useTestDataStats.ts` | `useTestDataStats.ts` |
| 5 | Ajouter la ligne stats + le nettoyage des conflits dans le cleanup manuel | `TestDataStatsCard.tsx` + `useTestDataActions.ts` |

### Harmonisation optionnelle

| # | Action | Fichier |
|---|--------|---------|
| 6 | Aligner `requester_legal_status` sur Title Case dans les demandes de titres | `testDataGenerators.ts` |

6 fichiers modifiés, 1 champ corrigé, 1 fonction branchée, 1 entité ajoutée aux stats/cleanup.

