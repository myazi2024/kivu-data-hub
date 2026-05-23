# Routes bordantes externes — lever l'alerte d'enclavement

## Problème
La validation "lot enclavé" ne reconnaît que les voies tracées **à l'intérieur** de la parcelle. Quand un lot longe une route publique existante hors parcelle (avenue, rue), l'utilisateur n'a aucun moyen de le signaler et reste bloqué.

## Solution
Ajouter un type de voie « **Route bordante (publique existante)** » :
- Sélection d'un **côté de la parcelle mère** + saisie nom + largeur
- Trace automatiquement une polyligne parallèle à ce côté, **côté extérieur** (offset = largeur/2)
- Marquée `isExisting: true` + nouveau flag `isExternal: true`
- **Aucun coût** d'infrastructure (revêtement / drainage / éclairage tous nuls)
- **N'affecte pas la géométrie** des lots (pas d'emprise rognée)
- Comptée par `lotTouchesRoad` → enclavement levé pour les lots adjacents à ce côté

## Modifications

### 1. Type
`src/components/cadastral/subdivision/types.ts` — ajouter `isExternal?: boolean` et `borderingParcelSideIndex?: number` sur `SubdivisionRoad`.

### 2. Frais serveur
`supabase/functions/_shared/subdivisionFees.ts` — `computeRoadInfrastructures` ignore (skip) les routes où `isExternal === true` : zéro coût.

### 3. UI — nouveau panneau
`src/components/cadastral/subdivision/steps/panels/BorderingRoadsPanel.tsx` (nouveau) :
- Liste des côtés de la parcelle mère (réutilise la logique d'orientation/longueur de `RoadBorderingSidesPanel`)
- Pour chaque côté : checkbox « borde une route publique » + select type (avenue, rue, nationale…) + nom + largeur (m)
- Bouton « Confirmer » → crée un `SubdivisionRoad` avec :
  - `path` = ligne parallèle au côté `i`, décalée vers l'extérieur de `widthM/(2·scale)`
  - `isExisting: true`, `isExternal: true`, `borderingParcelSideIndex: i`
  - Specs infra à `null`
- Édition / suppression d'une route bordante existante

### 4. Intégration designer
`StepLotDesigner.tsx` :
- Onglet « Voies » → 2 sous-sections : **Voies internes** (existant `RoadsListPanel`) + **Routes bordantes** (nouveau panneau)
- `RoadsListPanel` filtre `roads.filter(r => !r.isExternal)` (les externes n'apparaissent pas dans l'édition libre)
- Rendu canvas (`LotCanvas`) : routes externes dessinées en style distinct (trait hachuré + label "🛣 publique") sans poignées d'édition

### 5. Validation
`utils/subdivisionValidation.ts` — `requireRoadAccess: roads.length > 0` reste tel quel (les externes comptent comme routes). Pas de changement nécessaire car `lotTouchesRoad` parcourt déjà toutes les routes.

### 6. Helper géométrie
`utils/polygonOps.ts` — petite fonction `offsetSegmentOutward(a, b, parentCentroid, distance)` pour calculer le côté extérieur d'un segment par rapport au centre de la parcelle.

### 7. Mémoire projet
Mettre à jour `mem/admin/subdivision-infrastructure-catalog-fr.md` : routes `isExternal` exclues du calcul de frais.

## Hors scope
- Pas de modification d'admin (pas de tarif pour route externe)
- Pas de schéma DB (le champ est sérialisé dans le JSON existant `roads`)
- Pas de changement sur l'emprise des lots
