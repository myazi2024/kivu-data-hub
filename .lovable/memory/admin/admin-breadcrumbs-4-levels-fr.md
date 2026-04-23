---
name: Admin breadcrumb 4 niveaux
description: Breadcrumb Admin > Catégorie > Hub > Onglet actif sur subdivision-hub, requests-hub, history-hub via mapping HUB_SUBTAB_LABELS dans Admin.tsx
type: feature
---

Le fil d'Ariane admin affiche jusqu'à 4 niveaux quand un hub à onglets internes est actif :

`Admin > Catégorie > Hub > Sous-onglet`

## Implémentation

- Fichier : `src/pages/Admin.tsx`
- Mapping centralisé : `HUB_SUBTAB_LABELS: Record<hubTab, Record<subKey, label>>`
- Hubs couverts :
  - `subdivision-hub` → requests / fees / zoning / lots / analytics
  - `requests-hub` → overview / missing / sla / export
  - `history-hub` → timeline / overlaps
- Sous-onglet lu via `searchParams.get('sub')`, propagé par chaque hub (`AdminSubdivisionHub`, `AdminRequestsHub`, `AdminHistoryHub`).
- Le label du sous-onglet est en `text-foreground font-medium` quand présent ; sinon le hub lui-même est mis en valeur.

## Ajouter un nouveau hub à onglets

1. Le hub écrit `?sub=<key>` dans l'URL via `setParams`.
2. Ajouter une entrée `'<hub-tab>': { '<key>': '<label>' }` dans `HUB_SUBTAB_LABELS`.

Aucun composant breadcrumb réutilisable n'est nécessaire — la logique vit dans le shell Admin.
