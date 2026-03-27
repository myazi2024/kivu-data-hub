

# Refonte interactive du LotCanvas — Manipulation directe des lots

## Analyse de l'existant

Le `LotCanvas.tsx` (905 lignes) est un SVG statique avec des interactions limitees :

| Fonctionnalite | Statut |
|---|---|
| Drag vertex individuel | Fonctionne |
| Decoupe par ligne (cut) | Fonctionne |
| Tracage de voie | Fonctionne |
| Selection / multi-selection | Fonctionne |
| Split lot (double-clic) | Fonctionne |
| Fusion de lots | Fonctionne |
| **Drag & drop lot entier** | **Absent** |
| **Etirement d'arete (edge drag)** | **Absent** — les hit targets existent mais ne font rien |
| **Suppression depuis le canvas** | **Absent** — uniquement dans le panneau lateral |
| **Cliparts / icones** | **Absent** |
| **Snap to grid / edges** | **Absent** |
| **Zoom / pan** | **Absent** |
| **Raccourcis clavier** | **Absent** |
| **Touch gestures (mobile)** | **Partiel** — seul le long-press fonctionne |
| **Duplication de lot** | **Absent** |
| **Contrainte taille min** | **Absent** |
| **Rotation de lot** | **Absent** |

## Plan d'implementation

### 1. Drag & drop du lot entier

Ajouter un mode "move polygon" : quand l'utilisateur clique sur le remplissage d'un lot selectionne et le deplace, tous les vertices se translatent ensemble. Distinction entre clic sur vertex (resize) et clic sur surface (move).

### 2. Etirement d'arete (edge drag)

Les edge hit targets (lignes 601-626) existent deja avec le bon curseur mais ne declenchent aucune action. Ajouter un `onMouseDown` sur ces lignes pour deplacer les deux vertices de l'arete simultanement dans la direction perpendiculaire a l'arete.

### 3. Menu contextuel sur lot selectionne

Quand un lot est selectionne, afficher un petit toolbar flottant SVG au-dessus du lot avec des icones :
- Supprimer (poubelle)
- Diviser en 2
- Dupliquer
- Ajouter clipart

Cela remplace le bouton "Diviser" actuel et ajoute les actions manquantes.

### 4. Systeme de cliparts

Creer un catalogue d'icones SVG inline (arbre, maison, immeuble, puits, cloture, portail, voiture/parking, antenne) que l'utilisateur peut placer sur un lot. Stockes comme `annotations` dans le type `SubdivisionLot` :

```typescript
interface LotAnnotation {
  id: string;
  type: 'tree' | 'house' | 'building' | 'well' | 'fence' | 'gate' | 'parking' | 'antenna';
  position: Point2D; // relative to lot center
  scale?: number;
}
```

L'utilisateur selectionne un clipart dans la palette puis clique sur le lot pour le placer. Les cliparts sont deplacables par drag.

### 5. Snap to grid et snap to edges

Lors du drag de vertex/arete/lot :
- Snap magnetique aux lignes de grille (si grille active)
- Snap aux aretes des lots voisins (alignement)
- Indicateur visuel (ligne pointillee bleue) quand un snap est actif
- Tolerance de 8px

### 6. Zoom et pan

Ajouter un systeme de viewBox dynamique :
- Molette souris = zoom (min 0.5x, max 4x)
- Clic-molette ou Space+drag = pan
- Boutons +/- en overlay
- Double-clic sur fond = reset vue

### 7. Raccourcis clavier

- `Delete` / `Backspace` = supprimer lot selectionne
- `Ctrl+D` = dupliquer lot
- `Ctrl+Z` / `Ctrl+Y` = undo/redo (deja connectes)
- `Escape` = deselectionner / quitter mode
- `G` = toggle grille
- `S` = toggle snap

### 8. Support tactile complet

- Touch drag sur vertex = resize
- Touch drag sur surface = move lot
- Pinch = zoom
- Two-finger drag = pan
- Long press = menu contextuel

### 9. Contraintes et feedback

- Surface minimale configurable (defaut 50m²) — warning visuel si un lot passe en-dessous
- Lots ne peuvent pas sortir de la parcelle mere (clamp vertices)
- Detection de chevauchement entre lots (bordure rouge clignotante)

## Structure technique

```text
LotCanvas.tsx (refactorise)
├── Hooks extraits :
│   ├── useCanvasViewport.ts  — zoom, pan, viewBox
│   ├── useCanvasDrag.ts      — vertex/edge/polygon drag + snap
│   └── useCanvasKeyboard.ts  — raccourcis clavier
├── Composants SVG :
│   ├── LotPolygon.tsx        — rendu d'un lot avec vertices/aretes
│   ├── LotContextMenu.tsx    — toolbar flottant SVG
│   ├── ClipartIcon.tsx       — rendu d'un clipart SVG
│   └── ClipartPalette.tsx    — palette de selection (HTML overlay)
└── Types :
    └── types.ts              — LotAnnotation ajoutee
```

## Fichiers impactes

| Action | Fichier |
|---|---|
| Refactorise | `src/components/cadastral/subdivision/LotCanvas.tsx` — Drag lot, edge drag, zoom/pan, snap, menu contextuel, cliparts, touch |
| Cree | `src/components/cadastral/subdivision/hooks/useCanvasViewport.ts` — Zoom/pan state |
| Cree | `src/components/cadastral/subdivision/hooks/useCanvasDrag.ts` — Drag unifie (vertex/edge/polygon) + snap |
| Cree | `src/components/cadastral/subdivision/hooks/useCanvasKeyboard.ts` — Raccourcis clavier |
| Cree | `src/components/cadastral/subdivision/ClipartPalette.tsx` — Palette de cliparts |
| Modifie | `src/components/cadastral/subdivision/types.ts` — Ajouter `LotAnnotation`, `annotations` sur `SubdivisionLot` |
| Modifie | `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` — Connecter nouveau mode clipart, raccourcis, contraintes |

