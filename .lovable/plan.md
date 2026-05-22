## Constat de l'audit

L'onglet **Tarifs par type d'infrastructure** (admin > Lotissement) est désaligné avec **« Infrastructures requises par voie »** (formulaire) et avec les règles de zonage admin.

### Clés réellement consommées (voirie/voie)
Côté front (`infrastructureFromRoads.ts`) et serveur (`subdivision-request/index.ts`) :

| Source (voie) | Clé tarif lue | Quantité |
|---|---|---|
| `road.roadSurface.material` | `road_surface_<material>` | longueur × largeur (m²) |
| `road.drainageCanal` | `drainage` (générique) | longueur × côtés |
| `road.solarLighting` | `street_lighting` (générique) | nb mâts × côtés |

### Problèmes constatés
1. **Aucune entrée seed pour `road_surface_*`** alors que le catalogue `subdivision_road_surface_materials` est la source de vérité des matériaux. → Frais = 0 pour tout revêtement.
2. **Drainage** : un seul tarif `drainage` au lieu d'un tarif **par matériau** (béton, PVC, maçonnerie, pierre, métal, composite) et/ou **par type** (ouvert/couvert/enterré). L'utilisateur ne trouve donc pas « tuyau PVC ».
3. **Éclairage** : un seul `street_lighting` au lieu de différencier **solaire** vs raccordé. L'utilisateur ne trouve pas « éclairage public solaire ».
4. **Code mort dans le seed** : `road_primary`, `road_secondary`, `sidewalk`, `water_station` ne sont lus nulle part. `green_space`, `playground`, `community_center` ne sont pas utilisés non plus (les espaces communs passent par `common_space_fee_per_sqm_usd`).
5. **UI admin non structurée** : table à plat sans regroupement par catégorie, sans filtre, sans bouton de synchronisation avec le catalogue revêtements, sans badge « lié à voie », sans avertissement « clé orpheline ».
6. **Fallback `useSubdivisionInfrastructureTariffs.ts`** : contient encore les clés `road_primary`/`road_secondary` (code mort).

## Plan d'alignement

### 1. Migration (DB)
- **Supprimer** les seeds inutilisés : `road_primary`, `road_secondary`, `sidewalk`, `water_station`, `green_space`, `playground`, `community_center`.
- **Ajouter** les clés alignées sur le modèle « par voie » :
  - `road_surface_<material>` (sqm) pour chaque matériau actif de `subdivision_road_surface_materials` (rate 0 par défaut, `is_active=true`).
  - `drainage_beton`, `drainage_pvc`, `drainage_maconnerie`, `drainage_pierre`, `drainage_metal`, `drainage_composite` (linear_m).
  - Conservation de `drainage` comme **fallback** générique (utile si matériau non listé).
  - `street_lighting_solar` (unit) + conservation de `street_lighting` comme fallback.
- Ajouter une colonne `linked_to TEXT` (valeurs : `road_surface` | `drainage` | `street_lighting` | null) pour catégoriser l'usage dans la voie et piloter le regroupement UI.

### 2. Dérivation (front + edge function)
Mettre à jour `infrastructureFromRoads.ts` et `subdivision-request/index.ts` pour préférer la clé spécifique, avec fallback générique :
- Revêtement → `road_surface_<material>` (déjà OK).
- Drainage → `drainage_<material>` puis `drainage`.
- Éclairage → si `solarLighting` présent : `street_lighting_solar` puis `street_lighting`.

### 3. Refonte UI admin (`AdminSubdivisionInfrastructureTariffs.tsx`)
- **Regroupement par catégorie** (`voirie` / `reseau` / `amenagement` / `equipement`) avec sections collapsibles.
- **Filtres** : recherche (clé/libellé), catégorie, statut actif/inactif, type de section.
- **Badge « Lié à voie »** sur les clés `road_surface_*`, `drainage*`, `street_lighting*` indiquant la propriété de la voie qui les déclenche.
- **Bouton « Synchroniser avec catalogue revêtements »** : crée les `road_surface_<material>` manquantes (rate 0, inactif par défaut) pour chaque matériau actif du catalogue, sans toucher aux existantes.
- **Avertissement** : ligne en rouge si une clé `road_surface_*` ne correspond plus à un matériau actif du catalogue (orpheline).
- **Aide contextuelle** dans le header listant les conventions de clés.

### 4. Code mort à supprimer
- Fallback hardcodé `useSubdivisionInfrastructureTariffs.ts` : retirer entrées `road_primary` / `road_secondary` (remplacer par tableau vide, on s'appuie sur la DB seedée).
- Seed obsolète du fichier migration (cf. §1).
- Aucune autre référence trouvée dans le front.

### 5. Validation
- Vérifier visuellement la table groupée (catégories, filtres, sync).
- Soumettre un brouillon de lotissement avec revêtement bitume + drainage PVC + éclairage solaire et confirmer dans le récap : 3 lignes avec tarifs > 0 référençant les bonnes clés.

## Fichiers touchés
- **Migration SQL** : nouveau fichier (delete + insert + colonne `linked_to`).
- `src/components/admin/AdminSubdivisionInfrastructureTariffs.tsx` — refonte UI.
- `src/hooks/useSubdivisionInfrastructureTariffs.ts` — purge fallback mort, ajout champ `linked_to`.
- `src/components/cadastral/subdivision/utils/infrastructureFromRoads.ts` — clés spécifiques + fallback.
- `supabase/functions/subdivision-request/index.ts` — symétrie côté serveur.
- `.lovable/memory/admin/subdivision-admin-audit-fr.md` — note d'alignement.

Aucun changement à `RoadsListPanel`, `StepSummary` ou aux types : ils s'appuient déjà sur les champs `roadSurface.material`, `drainageCanal.material`, `solarLighting.*`.
