

# Audit — Données test invisibles dans "Données foncières"

## Diagnostic

Le probleme est dans `useLandDataAnalytics.tsx`, ligne 51 :

```typescript
if (testCol) query = query.not(testCol, 'ilike', 'TEST-%');
```

Ce filtre exclut **systematiquement** les donnees `TEST-%`, que l'utilisateur soit sur `/map` (production) ou `/test/map` (test). Le hook ne recoit jamais l'information `isTestRoute` et n'adapte donc jamais son comportement.

Consequence : sur la route `/test/map`, les graphiques et KPIs affichent 0 donnees test.

De plus, les tables FK (permis, taxes, hypotheques, ownership, fraudes) subissent un double filtrage :
1. `fetchAll` exclut les TEST-% via `TEST_FILTER_COLUMN` (pour celles qui ont une colonne directe)
2. `excludeTestFK` / `excludeTestContribFK` exclut aussi les records lies a des parcelles TEST-%

Sur la route test, **aucun de ces filtres ne s'inverse** pour montrer uniquement les donnees test.

## Correction

### Fichier : `src/hooks/useLandDataAnalytics.tsx`

1. Ajouter un parametre `isTestRoute` au hook (ou le detecter via `useTestEnvironment`)
2. Modifier `fetchAll` pour inverser le filtre selon le contexte :
   - Production : `query.not(testCol, 'ilike', 'TEST-%')` (actuel)
   - Test : `query.ilike(testCol, 'TEST-%')` (inverse)
3. Inverser `excludeTestFK` et `excludeTestContribFK` :
   - Production : exclure les records lies a des parcelles TEST-%
   - Test : ne garder **que** les records lies a des parcelles TEST-%
4. Ajouter `isTestRoute` dans la `queryKey` pour que le cache differencie les deux contextes

### Fichier : `src/components/DRCInteractiveMap.tsx`

5. Importer `useTestEnvironment` et passer `isTestRoute` a `useLandDataAnalytics`

**Impact** : ~15 lignes modifiees dans 2 fichiers. Aucune migration SQL.

