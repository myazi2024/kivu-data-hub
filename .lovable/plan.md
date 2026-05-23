## Finalisation harmonisation infrastructure lotissement

Suite à la migration DB (catalogues `subdivision_drainage_materials`, `subdivision_drainage_types`, colonne `price_multiplier`) et au correctif écran blanc, voici les 3 chantiers restants.

### 1. Calcul serveur unifié (`supabase/functions/_shared/subdivisionFees.ts`)

Remplacer l'ancienne logique par le modèle **base × multiplicateurs** :

```text
prix_revêtement  = tarif_base.road_surface     × material.mult × longueur × largeur
prix_drainage    = tarif_base.drainage         × material.mult × type.mult × longueur × côtés
prix_éclairage   = tarif_base.street_lighting  × nb_lampadaires
```

- Charger les 3 tarifs base via `infrastructure_key IN ('drainage','road_surface','street_lighting')`
- Charger les 3 catalogues (road_surface_materials, drainage_materials, drainage_types) avec leurs `price_multiplier`
- Fallback `multiplier = 1` si clé absente
- Logs explicites par voie pour audit
- Met à jour les edge functions consommatrices (création/recalcul demande lotissement)

### 2. UI admin — édition des multiplicateurs

**`AdminSubdivisionRoadSurfaceMaterials.tsx`** : ajouter colonne/champ `price_multiplier` (number, step 0.01, défaut 1.0) avec aide contextuelle "1.0 = prix de base".

**Nouveau** `src/components/admin/AdminSubdivisionDrainageCatalog.tsx` (2 onglets : Matériaux / Types) reprenant le même pattern que road_surface :
- Liste avec `key`, `label`, `price_multiplier`, `is_active`, `display_order`
- CRUD + toggle actif + réordonnancement
- Aperçu calcul : `base × mult = prix unitaire`

Intégration dans `AdminSubdivisionHub.tsx` (onglet Zonage ou nouveau sous-onglet "Catalogues").

### 3. Formulaire de demande de lotissement

Remplacer les constantes hardcodées par 3 hooks lisant les tables :
- `useRoadSurfaceMaterialsCatalog()` (déjà partiellement présent → garantir `price_multiplier`)
- `useDrainageMaterialsCatalog()` (nouveau)
- `useDrainageTypesCatalog()` (nouveau)

Dans le composant voirie/drainage :
- Dropdowns filtrés par `is_active`, triés par `display_order`
- Affichage estimation locale `base × mult` à titre indicatif (le calcul autoritatif reste serveur)
- Si une règle de zonage restreint `allowed_materials/types`, intersecter la liste

### 4. Mémoire projet

Mettre à jour `mem://admin/subdivision-infrastructure-catalog-fr` avec les hooks, l'emplacement UI admin, et la formule finale serveur.

### Ordre d'exécution
1. `subdivisionFees.ts` serveur (cœur métier)
2. UI admin multiplicateurs (édition humaine)
3. Hooks + formulaire (consommation)
4. Mémoire

### Fichiers touchés
- `supabase/functions/_shared/subdivisionFees.ts`
- Edge functions appelantes (recalcul si nécessaire)
- `src/components/admin/AdminSubdivisionRoadSurfaceMaterials.tsx`
- `src/components/admin/AdminSubdivisionDrainageCatalog.tsx` (nouveau)
- `src/components/admin/AdminSubdivisionHub.tsx`
- `src/hooks/useSubdivisionDrainageCatalog.ts` (nouveau)
- Composant voirie du formulaire demande lotissement
- `mem/admin/subdivision-infrastructure-catalog-fr.md`

Pas de nouvelle migration SQL (le schéma est déjà en place).
