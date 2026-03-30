

# Environnement test isolé via routes `/test/*`

## Problème
Les données test (`TEST-%`) et les données réelles coexistent dans les mêmes vues. Il n'y a aucune séparation : les utilisateurs voient les données test, et les testeurs voient les données de production.

## Solution

Créer un contexte React `TestEnvironmentContext` qui détermine si l'utilisateur navigue dans l'environnement test (`/test/*`) ou dans l'environnement de production. Toutes les requêtes Supabase seront filtrées automatiquement selon le contexte.

### Architecture

```text
/cadastral-map  ──► TestEnvironmentContext (mode=production)
                      └─ Exclut parcel_number ILIKE 'TEST-%'

/test/cadastral-map ──► TestEnvironmentContext (mode=test)
                          └─ Inclut UNIQUEMENT parcel_number ILIKE 'TEST-%'
```

### Étapes

**1. Créer `TestEnvironmentContext` + hook `useTestEnvironment`**
- Fichier : `src/hooks/useTestEnvironment.tsx`
- Détecte si le pathname commence par `/test/`
- Expose `isTestRoute: boolean` et une fonction helper `applyTestFilter(query, column)` qui ajoute `.ilike(column, 'TEST-%')` ou `.not(column, 'ilike', 'TEST-%')` selon le contexte

**2. Wrapper l'app avec le provider**
- Dans `App.tsx`, ajouter `<TestEnvironmentProvider>` autour des routes

**3. Ajouter les routes miroir `/test/*`**
- Dans `App.tsx`, dupliquer les routes principales sous `/test/` :
  - `/test/cadastral-map` → `<CadastralMap />`
  - `/test/map` → `<Map />`
  - `/test/mon-compte` → `<UserDashboard />` (protégé)
- Ces routes utilisent les mêmes composants — le filtrage est piloté par le contexte

**4. Filtrer les requêtes dans les hooks/composants clés**
- Modifier les principaux points de requête (~10 fichiers critiques) pour appliquer le filtre test/production :
  - `src/pages/CadastralMap.tsx` (recherche de parcelles)
  - `src/components/cadastral/CadastralSearchBar.tsx`
  - `src/components/cadastral/LandTitleRequestDialog.tsx`
  - `src/hooks/useCadastralSearch.ts`
  - `src/hooks/useAdvancedCadastralSearch.ts`
  - `src/components/admin/AdminCadastralMap.tsx`
  - `src/components/admin/AdminCCCContributions.tsx`
  - `src/pages/UserDashboard.tsx` (factures, contributions)
- Pattern : importer `useTestEnvironment()`, appeler `applyTestFilter(query, 'parcel_number')` sur chaque requête `.from('cadastral_parcels')` / `.from('cadastral_contributions')` / `.from('cadastral_invoices')`

**5. Indicateur visuel sur les routes test**
- Afficher un bandeau fixe en haut ("Environnement de test — les données affichées sont fictives") avec fond amber sur les routes `/test/*`
- Accessible depuis la page admin Mode Test via un lien direct vers `/test/cadastral-map`

### Avantage collatéral
Les routes de production (`/cadastral-map`, `/map`, etc.) **excluront désormais** les données `TEST-%`, résolvant le problème initial de contamination des données.

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/hooks/useTestEnvironment.tsx` | Nouveau — contexte + hook + helper de filtrage |
| `src/App.tsx` | Provider + routes `/test/*` |
| `src/components/TestEnvironmentBanner.tsx` | Nouveau — bandeau visuel |
| `src/pages/CadastralMap.tsx` | Ajouter filtre test |
| `src/components/cadastral/CadastralSearchBar.tsx` | Ajouter filtre test |
| `src/hooks/useCadastralSearch.ts` | Ajouter filtre test |
| `src/hooks/useAdvancedCadastralSearch.ts` | Ajouter filtre test |
| `src/components/cadastral/LandTitleRequestDialog.tsx` | Ajouter filtre test |
| `src/components/admin/AdminCadastralMap.tsx` | Ajouter filtre test |
| `src/components/admin/AdminCCCContributions.tsx` | Ajouter filtre test |
| `src/pages/UserDashboard.tsx` | Ajouter filtre test |
| `src/components/admin/test-mode/TestModeGuide.tsx` | Ajouter lien vers `/test/cadastral-map` |

