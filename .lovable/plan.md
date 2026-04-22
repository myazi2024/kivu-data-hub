

## Plan — Reclassification des zones tracées (Lot / Voie / Espace commun)

### Constat

Aujourd'hui, lorsqu'un utilisateur trace une forme dans la parcelle mère, elle devient automatiquement un **lot**. Pour créer une voie ou un espace commun, il fallait changer d'outil avant de dessiner. Or l'utilisateur veut **dessiner librement** puis **attribuer la fonction** à chaque zone tracée a posteriori.

### Principe

> Un seul geste de tracé. La nature de la zone (Lot / Voie / Espace commun) est un **attribut modifiable** depuis le panneau de droite, pas un mode de dessin.

### 1. Unification du tracé

- Tous les nouveaux tracés produisent par défaut une **zone de type « Lot »** (comportement actuel).
- L'outil ✂️ « Diviser un lot » reste tel quel : il découpe une zone existante en deux zones de **même type** que le parent.
- Plus aucun outil dédié à « Voie » ou « Espace commun » dans la toolbar.

### 2. Sélecteur de fonction dans le panneau de détail

Dans `StepLotDesigner.tsx`, panneau de droite (détail du lot sélectionné), ajouter en **tout premier champ** :

```text
┌─ Type de zone ────────────────────────────────┐
│ ◉ Lot       ○ Voie       ○ Espace commun     │
└───────────────────────────────────────────────┘
```

Comportement à la conversion :
- **Lot → Voie** : la zone est retirée de `lots[]`, ajoutée à `roads[]` (path = polyline simplifiée du polygone, largeur = `recommended_road_width_m` à venir du Lot 1, ou 6 m par défaut). Champs lot-spécifiques (usage, propriétaire, clôture…) masqués.
- **Lot → Espace commun** : retirée de `lots[]`, ajoutée à `commonSpaces[]` (avec sous-type : `green_space` / `parking` / `playground` / `market` / `drainage` / `other`).
- **Voie → Lot** ou **Espace commun → Lot** : reconversion vers `lots[]` avec usage par défaut `residential`.
- **Voie ↔ Espace commun** : conversion directe.

Toutes les conversions passent par un helper `convertZoneType(zone, fromType, toType)` qui mappe correctement la géométrie et préserve l'historique undo/redo.

### 3. Sous-type contextuel

Quand « Espace commun » est choisi, un second select apparaît juste en dessous :
- Espace vert · Parking · Aire de jeux · Marché · Drainage · Autre

Quand « Voie » est choisie : champs **largeur (m)**, **type de surface** (asphalte / gravier / terre / pavé / planifiée), **nom**.

### 4. Toolbar finale (rappel)

```text
┌─ Outils ──────────────┬─ Actions rapides ────────────────┬─ État ──────────┐
│ 🎯 Sélection           │ ➕ Lot = parcelle entière         │ 4 lots / 1 voie │
│ ✂️  Diviser une zone   │ ↶ Annuler   ↷ Rétablir           │ 1 espace commun │
└────────────────────────┴───────────────────────────────────┴─────────────────┘
```

Renommage : « Diviser un lot » → **« Diviser une zone »** (puisque ça s'applique aussi aux espaces communs).

### 5. Tooltip permanent contextualisé

- **Sélection** : « Cliquez sur une zone pour la sélectionner. Dans le panneau de droite, choisissez si c'est un lot, une voie ou un espace commun. »
- **Diviser** : « Cliquez sur le premier bord de la zone, puis sur le second bord, pour la couper en deux. »

### 6. Liste de droite réorganisée

Une seule liste « Zones » groupée par type avec compteurs :
```text
🟢 Lots (4)
   ├─ Lot 1 · 245 m² · résidentiel
   └─ …
🛣️ Voies (1)
   └─ Voie A · 6 m · asphalte
🌳 Espaces communs (1)
   └─ Espace vert · 180 m²
```

### 7. Fichiers impactés

| Fichier | Action |
|---|---|
| `subdivision/steps/StepLotDesigner.tsx` | Sélecteur type zone + champs contextuels + liste regroupée + renommages |
| `subdivision/utils/convertZoneType.ts` | **Nouveau** : helper de conversion lot↔voie↔espace commun avec préservation géométrie + historique |
| `subdivision/LotCanvas.tsx` | Le tracé / la division produit toujours un lot ; aucune logique mode `drawRoad` à exposer (reste interne) |
| `subdivision/types.ts` | Aucun changement de type (déjà 3 types distincts existants) |

### Hors scope (lots suivants)

- Lot 1 BD : `subdivision_zoning_rules` (largeur voie pré-remplie, validations min)
- Lot 2b : Mode avancé (vertex, fusion, rotation)
- Lot 2c : Badges « Trop petit » + highlight côté route

### Vérification

1. Tracer une zone → apparaît comme « Lot » par défaut
2. Dans le panneau, basculer le radio sur « Voie » → la zone disparaît de la liste Lots et apparaît dans Voies, champs largeur/surface visibles
3. Basculer sur « Espace commun » → sous-type visible, couleur change selon sous-type
4. Reconvertir en « Lot » → géométrie préservée, usage par défaut résidentiel
5. Undo/Redo restitue correctement le type précédent

