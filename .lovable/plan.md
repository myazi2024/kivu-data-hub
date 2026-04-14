

# Fix: Déplacement des sommets de construction par appui prolongé

## Problème racine

Le code de drag existe (lignes 1065-1143) mais ne fonctionne pas car :

1. **Re-rendu destructeur** : Quand `endBvDrag` appelle `onBuildingShapesChange`, cela déclenche un re-rendu qui re-exécute l'effet. Tous les markers sont détruits (`buildingLayersRef.current.forEach(layer => map.removeLayer(layer))`) et recréés — le drag est interrompu.

2. **Listeners map jamais nettoyés** : `map.on('mousemove', moveBvDrag)` est ajouté dans la boucle `forEach` mais jamais retiré dans le cleanup. Les anciennes fonctions `moveBvDrag` avec `bvDragging = false` s'accumulent.

3. **Variable locale `bvDragging`** : Étant locale au closure, elle est perdue à chaque re-rendu.

## Solution

Utiliser des **refs** pour l'état de drag (comme le pattern existant de `selectedBorneRef`) et **empêcher la destruction des markers pendant le drag** :

### Modifications dans `ParcelMapPreview.tsx`

1. **Ajouter des refs pour le drag de construction** (après ligne 151) :
   - `bvDragActiveRef = useRef(false)` — flag global de drag actif
   - `bvDragShapeIdRef = useRef<string | null>(null)` — ID du shape en cours de drag
   - `bvDragVertexIdxRef = useRef<number>(-1)` — index du sommet
   - `bvDragMarkerRef = useRef<any>(null)` — référence au marker déplacé

2. **Protéger les markers pendant le drag** (ligne 799) : Ajouter `if (bvDragActiveRef.current) return;` au début du bloc de nettoyage des building layers pour ne pas détruire les markers mid-drag.

3. **Réécrire les handlers de drag** (lignes 1065-1140) : Remplacer les variables locales par les refs. Dans `endBvDrag`, d'abord reset les refs, puis appeler `onBuildingShapesChange`.

4. **Nettoyer les listeners map** : Stocker les handlers dans un ref ou un tableau pour les retirer proprement dans le cleanup de l'effet. Ajouter `map.off('mousemove', moveBvDrag)` dans le cleanup.

5. **Même fix pour les bornes de parcelle** si le même problème s'y applique (vérifier que le pattern `selectedBorneRef` existant fonctionne déjà — il semble correct car les bornes utilisent `marker.dragging` natif de Leaflet, pas un drag custom).

### Fichier impacté
- `src/components/cadastral/ParcelMapPreview.tsx`

