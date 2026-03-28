

# Séparer "Tracer une voie" et "Tracer une ligne"

## Situation actuelle
Un seul bouton **"Tracer ligne"** entre en mode `drawLine`. Après le tracé, un menu contextuel propose "Diviser le lot" ou "Créer une voie". L'utilisateur veut deux boutons distincts pour éviter cette étape intermédiaire.

## Solution

### 1. Nouveau mode canvas `drawRoad`
Ajouter `'drawRoad'` au type `CanvasMode` dans `LotCanvas.tsx`. Ce mode réutilise toute la mécanique de tracé existante (points, preview, distances perpendiculaires) mais appelle directement `onFinishRoadDraw` à la fin du tracé — sans afficher le menu de choix.

### 2. Deux boutons dans la toolbar
Dans `StepLotDesigner.tsx`, remplacer le bouton unique par :
- **Tracer ligne** (icône Pencil) → mode `drawLine` → à la fin du tracé, coupe directement le lot (pas de menu)
- **Tracer voie** (icône Route/Road) → mode `drawRoad` → à la fin du tracé, crée directement une voie (pas de menu)

### 3. Suppression du menu de choix post-tracé
Le `lineChoiceMenu` n'est plus nécessaire pour ces deux modes. En mode `drawLine`, la fin du tracé appelle directement `onCutLot`. En mode `drawRoad`, elle appelle directement `onFinishRoadDraw`.

### Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `LotCanvas.tsx` | Ajouter `'drawRoad'` à `CanvasMode`, dupliquer la logique de tracé pour ce mode, supprimer le `lineChoiceMenu` au profit d'appels directs selon le mode |
| `StepLotDesigner.tsx` | Remplacer le bouton unique par deux boutons séparés, importer une icône route (ex: `Route` de lucide) |

