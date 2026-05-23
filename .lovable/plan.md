
## Audit — état actuel

**Trois sources de vérité non alignées :**

| Champ | Zonage (admin) lit depuis | Frais (admin) écrit dans | Formulaire demande lit depuis |
|---|---|---|---|
| Drainage – matériaux | `DRAINAGE_CANAL_MATERIALS` (constantes TS) | `subdivision_infrastructure_tariffs` clés `drainage_<material>` | constantes TS (labels) + tarifs |
| Drainage – types (ouvert/couvert/enterré) | `DRAINAGE_CANAL_TYPES` (constantes TS) | **aucun tarif** | constantes TS, pas de prix |
| Revêtement – matériaux | table `subdivision_road_surface_materials` | `subdivision_infrastructure_tariffs` clés `road_surface_<material>` | table + tarifs |

**Problèmes confirmés :**

1. **Doublons en base** dans `subdivision_infrastructure_tariffs` (cause probable de l'écran blanc) :
   - `road_surface_bitume` × 3 lignes (rates 18, 14, 0), idem `pave_beton`, `pave_pierre`, `briques`, `beton_coule`, `gravier_stabilise`.
   - Lignes "voirie" à 0 USD qui doublonnent les lignes "road_surface".
   - Aucune contrainte UNIQUE → React keys dupliquées + résultats `.find()` non déterministes côté front.
2. **Écran blanc** : pas de runtime error capturé, mais les `<label>` checkbox dans le dialog s'exécutent dans le même render que `materials.map(...)` qui peut recevoir des doublons via `roadSurfaceTariffKeys`. Aucun `<ErrorBoundary>` n'entoure le dialog → toute exception remonte au root et blanchit la page.
3. **Drainage hardcodé** : admin ne peut pas éditer la liste, et les **types** drainage n'ont aucun tarif rattaché.
4. **Convention de clé incohérente** : `road_surface_*` vs `drainage_*` vs `street_lighting_*` — pas de règle écrite.

---

## Plan d'harmonisation

### 1. Catalogues éditables en base (parité avec road_surface)

Créer deux nouvelles tables admin :

```text
subdivision_drainage_materials  (key, label, description, is_active, display_order)
subdivision_drainage_types      (key, label, description, is_active, display_order)
```

Seed initial = valeurs actuelles des constantes TS (`beton/pvc/maconnerie/pierre/metal/composite` + `ouvert/couvert/enterre`).

Les constantes `DRAINAGE_CANAL_MATERIALS/TYPES` restent comme fallback offline mais l'UI lit la table.

### 2. Tarification "base + multiplicateurs"

Modèle retenu (réponse utilisateur) :

- **Une ligne de tarif "base" par catégorie** dans `subdivision_infrastructure_tariffs` :
  - `drainage` (rate USD / mètre linéaire)
  - `road_surface` (rate USD / m²)
  - `street_lighting` (rate USD / unité)
- **Multiplicateurs stockés dans le catalogue lui-même** (nouvelle colonne `price_multiplier numeric default 1.0`) :
  - `subdivision_road_surface_materials.price_multiplier`
  - `subdivision_drainage_materials.price_multiplier`
  - `subdivision_drainage_types.price_multiplier` (ex: ouvert=1, couvert=1.4, enterré=2)

**Calcul final** dans `_shared/subdivisionFees.ts` :
```text
prix_revêtement(road) = base.road_surface × material.mult × longueur × largeur
prix_drainage(road)   = base.drainage × material.mult × type.mult × longueur × (côtés)
prix_éclairage(road)  = base.street_lighting × nb_lampadaires
```

### 3. Dédoublonnage + contraintes

Migration de nettoyage `subdivision_infrastructure_tariffs` :
- Pour chaque `infrastructure_key`, garder la ligne au `rate_usd > 0` la plus récente, supprimer les autres.
- Supprimer toutes les lignes `road_surface_*` et `drainage_*` détaillées (elles deviennent obsolètes — remplacées par catalogue.multiplier).
- Ajouter `UNIQUE (infrastructure_key)`.
- Garder uniquement les 3 clés base : `drainage`, `road_surface`, `street_lighting` (+ legacy `street_lighting_solar` si distinct).

Onglet **Frais → Tarifs par type d'infrastructure** :
- Afficher seulement les 3 tarifs base + bloc "Multiplicateurs par matériau/type" (édition inline du catalogue).

### 4. Convention de clé documentée

`<linked_to>` (catégorie) reste la racine ; multiplicateurs portés par le catalogue (pas par la clé tarif). Plus de clés composées en base → fini les doublons.

### 5. Fix immédiat écran blanc (avant la grosse migration)

- Wrapper `<ErrorBoundary>` autour du `DialogContent` du formulaire de règle de zonage avec message d'erreur lisible.
- Déduper `materials` et `roadSurfaceTariffKeys` côté React : `Array.from(new Map(materials.map(m => [m.key, m])).values())`.
- `useCallback`/`useMemo` sur les handlers pour éviter re-render en cascade.
- Sécuriser `form.drainage_canal_allowed_materials.includes(m)` → `(form.drainage_canal_allowed_materials ?? []).includes(m)` (1121, 1143).
- Logger l'erreur en console + toast au lieu d'un crash silencieux.

### 6. Front formulaire de demande

`src/components/cadastral/subdivision/infrastructureConstants.ts` :
- Remplacer constantes par hooks `useDrainageMaterials()`, `useDrainageTypes()`, `useRoadSurfaceMaterials()` qui lisent les tables.
- Si la règle de zonage n'autorise pas un matériau (allowed_materials), il est masqué du sélecteur.
- Le prix unitaire affiché à côté de chaque option = `base.rate × multiplier`.

---

## Détails techniques (pour le dev)

**Migrations SQL nécessaires :**
1. `CREATE TABLE subdivision_drainage_materials` + RLS lecture publique / écriture admin via `has_role(auth.uid(),'admin')`.
2. `CREATE TABLE subdivision_drainage_types` (idem).
3. `ALTER TABLE subdivision_road_surface_materials ADD COLUMN price_multiplier numeric NOT NULL DEFAULT 1.0`.
4. Cleanup `subdivision_infrastructure_tariffs` (DELETE doublons + DELETE clés détaillées) puis `ALTER TABLE … ADD CONSTRAINT uniq_infra_key UNIQUE (infrastructure_key)`.
5. Seed des 3 tarifs base si absents (`drainage` 2 USD/m, `road_surface` 18 USD/m², `street_lighting` 150 USD/u).
6. Seed catalogues drainage avec multiplicateurs raisonnables.

**Fichiers à modifier :**
- `src/components/admin/AdminSubdivisionZoningRules.tsx` (fix bug + lecture catalogues drainage).
- `src/components/admin/AdminSubdivisionInfrastructureTariffs.tsx` (refonte : 3 tarifs base + tableaux multiplicateurs).
- `src/components/cadastral/subdivision/infrastructureConstants.ts` (constantes → fallback).
- Nouveaux hooks : `src/hooks/useSubdivisionDrainageCatalog.ts`.
- `supabase/functions/_shared/subdivisionFees.ts` (calcul base × multiplicateurs).
- `src/components/admin/subdivision/zoningValidation.ts` (valider via catalogue dynamique au lieu de set hardcodé).

**Ordre d'exécution recommandé :**
1. Hotfix écran blanc (étape 5) — déployable immédiatement, sans migration.
2. Migration SQL (étapes 1-4) — 1 seul fichier, revue avant exécution.
3. Refonte UI admin + frontend demande.
4. Mémoire projet `mem://admin/subdivision-infrastructure-catalog-fr.md`.
