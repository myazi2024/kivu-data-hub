

# Refonte du tracage de lignes — Ligne universelle + affichage des distances

## Concept

Actuellement, tracer une ligne dans le canvas a deux modes distincts et rigides :
- **Mode "Decouper"** (`cut`) : coupe un lot en deux, pas de proprietes configurables
- **Mode "Tracer voie"** (`drawRoad`) : cree une voie, jamais une division de lot

L'utilisateur veut un **outil unique "Tracer ligne"** qui :
1. Trace une ligne sur le canvas (drag simple ou multi-segments)
2. Affiche en temps reel la **distance entre cette ligne et les lignes paralleles de part et d'autre** (aretes de lots voisins, bords de la parcelle mere)
3. Apres le trace, demande a l'utilisateur : **"C'est une voie ou une division de lot ?"**
   - Si **voie** → cree un `SubdivisionRoad` (comme aujourd'hui)
   - Si **division** → coupe le lot traverse en deux (comme le mode `cut`)

## Implementation

### 1. Fusionner les modes `cut` et `drawRoad` en un seul mode `drawLine`

Remplacer les deux modes par un unique mode `drawLine` dans `CanvasMode`. Le tracage utilise le meme systeme de drag simple + multi-segments deja implemente pour les voies (preview en temps reel, snap, boutons flottants).

### 2. Afficher les distances perpendiculaires en temps reel

Pendant le tracage (mouseMove), calculer la distance perpendiculaire entre la ligne en cours et :
- Les aretes paralleles des lots adjacents
- Les bords de la parcelle mere

Afficher ces distances comme des cotes (lignes fines + label "Xm") de part et d'autre de la ligne tracee. Algorithme :
- Pour chaque arete de lot/parcelle, calculer l'angle avec la ligne tracee
- Si l'angle est < 15 degres (quasi-parallele), calculer la distance perpendiculaire
- Afficher un trait fin + label entre le milieu de la ligne tracee et le milieu de l'arete parallele

### 3. Dialog de choix apres le trace

Quand l'utilisateur termine le trace (mouseUp ou bouton "Terminer"), afficher un **mini-menu flottant SVG** sur le canvas avec deux options :
- **"Diviser le lot"** (icone ciseaux) → execute la logique `handleCutLot` existante
- **"Creer une voie"** (icone route) → execute la logique `handleFinishRoadDraw` existante

Ce menu s'affiche pres du point final de la ligne.

### 4. Mettre a jour la toolbar

- Remplacer les boutons "Decouper" et "Tracer voie" par un seul bouton **"Tracer ligne"**
- Le panneau de pre-configuration voie (largeur/surface) s'affiche uniquement si l'utilisateur choisit "Creer une voie" dans le menu de choix (ou en option avancee dans la toolbar)

## Details techniques

```text
Flux utilisateur :
1. Clic "Tracer ligne" dans la toolbar
2. Drag/clic sur le canvas → ligne preview + distances affichees
3. Relachement → mini-menu : "Diviser lot" | "Creer voie"
4a. "Diviser" → coupe le lot, retour mode select
4b. "Voie" → ouvre config largeur/surface, cree la voie
```

Calcul des distances perpendiculaires :
```text
Pour une ligne tracee AB et une arete CD quasi-parallele :
- Direction AB : d = normalize(B - A)
- Normale : n = perpendiculaire(d)
- Distance = |dot(C - A, n)|
- Afficher en metres : distance_norm * sqrt(parentAreaSqm)
```

### 5. Conserver la retrocompatibilite

- Le mode `clipart` reste inchange
- Le mode `select` reste inchange
- Les voies existantes restent editables (poignees, suppression)

## Fichiers impactes

| Action | Fichier |
|---|---|
| Modifie | `src/components/cadastral/subdivision/LotCanvas.tsx` — Fusionner cut/drawRoad en `drawLine`, afficher distances perpendiculaires, menu de choix post-trace |
| Modifie | `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` — Toolbar simplifiee (un seul bouton), logique de choix voie/division |
| Modifie | `src/components/cadastral/subdivision/hooks/useCanvasKeyboard.ts` — Adapter raccourcis au nouveau mode |

