

# Refonte de la creation de voies — Approche intuitive

## Problemes actuels

1. **Pas de conversion limite-en-voie** : Si deux lots partagent une limite commune, l'utilisateur ne peut pas la transformer en voie. Il doit supprimer les lots, retracer, etc.
2. **Le menu contextuel post-trace est la seule facon de creer une voie** : pas d'action directe sur les elements existants.
3. **Ajout de voie via "+"** cree une voie rigide au centre — peu utile.
4. **Aucune aide visuelle** pour comprendre qu'une limite peut devenir une voie.

## Solution — 3 mecanismes complementaires

### 1. Clic droit sur une arete partagee → "Convertir en voie"

Quand l'utilisateur fait un **clic droit (ou double-clic) sur une arete entre deux lots**, un menu contextuel s'affiche avec l'option **"Convertir en voie"**. En cliquant :
- Une voie est creee le long de cette arete avec la largeur par defaut (6m)
- Les deux lots adjacents sont **retrecis** automatiquement de chaque cote (3m chacun) pour laisser la place a la voie
- La voie apparait immediatement, selectable et ajustable (largeur, nom, revetement)

```text
  Avant:                    Apres:
  ┌──────┬──────┐           ┌─────┐     ┌─────┐
  │ Lot1 │ Lot2 │    →      │Lot1 │═════│Lot2 │
  │      │      │           │     │voie │     │
  └──────┴──────┘           └─────┘     └─────┘
```

### 2. Amelioration du menu contextuel (lots)

Le menu contextuel existant (double-clic/clic droit sur un lot) gagne une option **"Creer une voie sur ce cote"** qui affiche les aretes du lot. L'utilisateur clique sur l'arete souhaitee et la voie est creee le long de celle-ci.

### 3. Simplification du bouton "+" voies

Remplacer le bouton "+" actuel (qui cree une voie au centre) par un bouton qui active un **mode de selection d'arete**. L'utilisateur clique sur n'importe quelle arete de lot, et la voie est creee le long de cette arete. Un message d'instruction s'affiche : "Cliquez sur une limite entre deux lots pour creer une voie".

## Details techniques

### Detection d'aretes partagees
- Parcourir toutes les paires d'aretes entre lots
- Deux aretes sont "partagees" si leurs extremites sont proches (tolerance ~0.01 en coordonnees normalisees)
- Stocker la correspondance lot1/arete1 ↔ lot2/arete2

### Retrecissement des lots lors de la conversion
- Calculer la normale de l'arete partagee
- Deplacer les sommets de chaque lot de `(largeur_voie / 2) / sideLength` dans la direction opposee a la voie
- Recalculer `areaSqm` et `perimeterM` apres deplacement

### Nouveau mode canvas : `selectEdge`
- Quand actif, survoler une arete la met en surbrillance (epaisseur + couleur)
- Cliquer cree la voie
- Le mode se desactive automatiquement apres creation

### Menu contextuel sur arete
- Detecter le clic droit sur une arete (pas sur le polygone entier)
- Afficher un petit menu SVG flottant avec "Convertir en voie" + icone
- Si l'arete n'est pas partagee (bordure de parcelle), proposer "Creer une voie le long de ce cote"

## Fichiers impactes

| Action | Fichier |
|--------|---------|
| Modifie | `LotCanvas.tsx` — Ajouter mode `selectEdge`, detection hover/clic sur aretes, menu contextuel sur arete, surbrillance des aretes partagees |
| Modifie | `StepLotDesigner.tsx` — Logique `convertEdgeToRoad` (retrecissement lots + creation voie), remplacer le bouton "+" voie par activation du mode `selectEdge`, ajouter option dans menu contextuel lot |
| Modifie | `LotCanvas.tsx` (types) — Ajouter `selectEdge` au type `CanvasMode` |

