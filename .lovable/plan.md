

# Corriger le mode "Ajouter une construction" dans le croquis parcelle

## Problème identifié

Quand l'utilisateur clique sur "Ajouter une construction" puis choisit une forme, le mode construction s'active visuellement (curseur crosshair, badge rouge) mais **les clics sur la carte ne dessinent rien**. Deux causes :

1. **Le dragging de la carte n'est pas désactivé** : `startAddingBuilding` (ligne 1475) ne désactive ni le dragging, ni le scrollWheelZoom, ni le touchZoom. Résultat : sur mobile/tactile, le tap est interprété comme un drag plutôt qu'un clic. Même sur desktop, un micro-mouvement de souris transforme le clic en pan.

2. **Le mode dessin n'est pas explicitement désactivé** : Si `drawingMode` est encore `'true'` dans le dataset (cas rare mais possible), le handler de clic (ligne 451) route vers `addMarkerCallbackRef` au lieu de `addBuildingCallbackRef`.

3. **Pas de feedback en cas de clic hors parcelle** : `addBuildingShape` (ligne 599) fait un `return` silencieux si le clic est hors du polygone. L'utilisateur ne sait pas pourquoi rien ne se passe.

## Corrections

**Fichier** : `src/components/cadastral/ParcelMapPreview.tsx`

### 1. `startAddingBuilding` — Désactiver les interactions carte (ligne 1475)
Ajouter la désactivation du dragging, scrollWheelZoom, doubleClickZoom et touchZoom (comme `toggleDrawingMode` le fait). Également forcer `dataset.drawingMode = 'false'` et `setIsDrawingMode(false)` pour éviter les conflits.

### 2. `addBuildingShape` — Réactiver les interactions après placement (ligne 614)
Après le placement de la construction, réactiver dragging, scrollWheelZoom, doubleClickZoom et touchZoom.

### 3. `addBuildingShape` — Ajouter un feedback visuel si clic hors parcelle (ligne 599)
Au lieu du `return` silencieux, afficher un toast ou une alerte éphémère pour informer l'utilisateur qu'il doit cliquer à l'intérieur de la parcelle.

### 4. Bouton d'annulation du mode construction
Actuellement, il n'y a pas de moyen d'annuler le mode construction une fois activé (pas de bouton pour sortir). Ajouter une logique pour que re-cliquer sur le bouton Building2 annule le mode et réactive les interactions carte.

**Impact** : ~30 lignes modifiées/ajoutées dans 1 fichier.

