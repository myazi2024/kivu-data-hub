

# Refonte du tracage de voies — UX simplifiee

## Problemes actuels

| Probleme | Detail |
|----------|--------|
| **Click-by-click peu intuitif** | L'utilisateur doit cliquer point par point pour tracer la voie, puis double-cliquer pour terminer. Un utilisateur non technique ne comprend pas cette mecanique. |
| **Pas de preview de la largeur** | La voie est tracee comme une simple ligne de 4px. L'utilisateur ne voit pas la largeur reelle (6m, 8m...) pendant le tracage. |
| **Double-clic = reset vue** | Le double-clic en mode `select` reset la vue (zoom), ce qui interfere avec la terminaison du tracage si l'utilisateur change de mode par erreur. |
| **Aucun feedback "prochaine etape"** | Apres le trace, la voie est creee silencieusement. Pas de confirmation visuelle ni de transition vers l'edition des proprietes. |
| **Pas d'annulation pendant le tracage** | Impossible de supprimer le dernier point place ou d'annuler le tracage en cours. |
| **Voies = lignes droites uniquement** | Le rendu final (lignes 484-510) ne dessine qu'une seule ligne entre le premier et le dernier point, ignorant les points intermediaires. Les voies courbes sont impossibles. |
| **Pas de drag pour repositionner** | Une voie tracee ne peut pas etre deplacee ou ajustee apres creation. Il faut la supprimer et recommencer. |

## Solution proposee : mode "Tracer voie" simplifie

### Nouveau flux utilisateur

1. **Clic sur "Tracer voie"** → Un panneau lateral s'ouvre pour configurer la largeur et le type AVANT de tracer (pas apres)
2. **Clic-glisser sur le canvas** → La voie se trace en drag continu (start → end), avec un rectangle semi-transparent montrant la largeur reelle
3. **Relachement** → La voie est creee instantanement, le panneau d'edition s'ouvre pour ajuster nom/surface
4. **Alternative multi-segments** : Maintenir Shift pour ajouter des segments supplementaires (voie en L, en T)

### Fonctionnalites ajoutees

- **Preview de largeur en temps reel** : Pendant le tracage, afficher un rectangle translucide representant la largeur configuree
- **Annuler dernier point** : Touche `Backspace` ou bouton pour retirer le dernier point pendant un trace multi-segments
- **Repositionner une voie** : Drag & drop des extremites d'une voie existante en mode selection
- **Polyline complete** : Le rendu des voies utilise `<polyline>` au lieu d'une seule `<line>` pour supporter les traces multi-segments
- **Snap aux bords de la parcelle** : Les extremites de la voie s'accrochent aux bords de la parcelle mere et aux limites de lots
- **Bouton "Terminer"** flottant sur le canvas (remplace le double-clic non intuitif)

## Implementation technique

### 1. Panneau de pre-configuration de voie (StepLotDesigner)

Quand l'utilisateur clique "Tracer voie", afficher un mini-panneau inline avec largeur (slider 3-20m) et type de surface. Ces valeurs sont passees au canvas et utilisees pour le preview.

### 2. Refonte du mode drawRoad dans LotCanvas

- Remplacer le systeme click-by-click par un mode drag (mouseDown → mouseMove → mouseUp) pour les voies simples (2 points)
- Garder le mode multi-click pour les voies complexes (activer via Shift ou un toggle)
- Afficher un rectangle de preview avec la largeur configuree pendant le trace
- Ajouter un bouton flottant SVG "Terminer ✓" et "Annuler ✗" visibles pendant le trace multi-segments
- Supporter `Backspace` pour retirer le dernier point

### 3. Rendu polyline des voies

Remplacer la `<line>` unique (premier→dernier point) par une `<polyline>` qui suit tous les points du path. Ajouter un `<polyline>` parallele decalee pour visualiser la largeur.

### 4. Drag des extremites de voie

En mode select, quand une voie est selectionnee, afficher des poignees (cercles) sur chaque point du path. Ces poignees sont draggables pour repositionner la voie.

## Fichiers impactes

| Action | Fichier |
|---|---|
| Modifie | `src/components/cadastral/subdivision/LotCanvas.tsx` — Nouveau mode drawRoad (drag simple + multi-click), preview largeur, polyline, poignees de voie, boutons flottants |
| Modifie | `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` — Panneau de pre-configuration voie (largeur/surface avant trace) |
| Modifie | `src/components/cadastral/subdivision/hooks/useCanvasDrag.ts` — Ajouter drag des extremites de voie |
| Modifie | `src/components/cadastral/subdivision/hooks/useCanvasKeyboard.ts` — Backspace pour retirer dernier point en mode drawRoad |

