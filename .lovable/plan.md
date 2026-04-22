

## Plan — Nettoyage cliparts + barre d'outils grand public (Lot 2a)

Premier sous-lot du Lot 2 : on purge tout ce qui concerne les cliparts et on remplace la toolbar actuelle par une version grand public à 3 outils. La logique de validation BD (Lot 1 — règles de zonage admin) et le mode avancé (Lot 2b) viendront après.

### 1. Suppression définitive des cliparts

| Élément | Action |
|---|---|
| `subdivision/ClipartPalette.tsx` | Supprimer le fichier |
| `CLIPART_TYPES`, `LotAnnotation` (cliparts), type `'clipart'` dans `CanvasMode` | Retirer de `subdivision/types.ts` |
| `mode === 'clipart'`, `selectedClipart`, gestion clic clipart, rendu SVG des shapes clipart | Retirer de `LotCanvas.tsx` |
| Bouton « Cliparts », import `ClipartPalette`, état `showClipartPalette` | Retirer de `StepLotDesigner.tsx` |
| Stickers persistés (`annotations` côté lot) | Migration douce : si présents en draft local on les ignore au rendu, on ne casse pas le type. |
| Icônes `Circle/Square/RectangleHorizontal/Triangle/Hexagon` importées uniquement pour cliparts | Nettoyer imports orphelins |

### 2. Nouvelle barre d'outils grand public

Remplacement de la toolbar actuelle par 3 zones claires, dans `StepLotDesigner.tsx` :

```text
┌─ Outils ──────────────┬─ Actions rapides ────────────────┬─ État ──────────┐
│ 🎯 Sélection           │ ➕ Lot = parcelle entière         │ 4 lots          │
│ ✂️  Diviser un lot     │ ↶ Annuler   ↷ Rétablir           │ 78% couvert     │
│ 🛣️  Tracer une voie    │                                   │                 │
└────────────────────────┴───────────────────────────────────┴─────────────────┘
```

- Boutons larges, icône + libellé court, **tooltip long explicatif**
- Outil actif mis en évidence (ring primary)
- Snap : toujours activé, **plus de bouton** (suppression du toggle visible)
- Suppression du raccourci clavier `Delete` (remplacé par bouton corbeille dans le panneau de détail du lot — déjà existant)
- Mode `selectEdge` : retiré de la toolbar publique (sera réintroduit en Lot 2b « Mode avancé »)

### 3. Tooltip permanent contextualisé sous le canvas

Une ligne discrète sous le SVG, change selon `mode` :
- **Sélection** : « Cliquez sur un lot pour le sélectionner. Glissez pour le déplacer. »
- **Diviser** : « Cliquez sur le premier bord du lot, puis sur le second bord, pour le couper en deux. »
- **Voie** : « Cliquez deux points pour tracer une voie. »

### 4. Renommage UX

| Avant (technique) | Après (grand public) |
|---|---|
| « Tracer ligne » | « Diviser un lot » |
| « Tracer voie » | « Tracer une voie » |
| « Sélection edge » | (retiré — mode avancé plus tard) |
| « Cliparts » | (supprimé) |

### 5. Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/cadastral/subdivision/ClipartPalette.tsx` | **Supprimé** |
| `src/components/cadastral/subdivision/types.ts` | Retirer cliparts du type |
| `src/components/cadastral/subdivision/LotCanvas.tsx` | Purge mode clipart + rendu |
| `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` | Nouvelle toolbar 3 zones + tooltip contextuel |

### Hors scope (lots suivants)

- **Lot 1** : table `subdivision_zoning_rules` (ou extension `subdivision_rate_config`) + UI admin règles + hook `useZoningRules` + bandeau d'aide
- **Lot 2b** : toggle « Mode avancé » réintroduisant vertex/edge/fusion/rotation
- **Lot 2c** : badges de validation post-tracé (« Trop petit ») et highlight orange du côté qui borde la route
- Décision en attente : `subdivision_rate_config` étendue OU table dédiée

### Vérification

1. Plus aucune référence à `clipart` / `ClipartPalette` dans le code (`grep` clean)
2. Toolbar lotissement n'affiche que 3 outils + 3 actions rapides + état
3. Tooltip sous canvas change avec le mode
4. Diviser et Tracer voie fonctionnent comme avant (logique inchangée)
5. Aucune régression sur les lots déjà créés en brouillon

