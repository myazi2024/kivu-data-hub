

# Suppression de l'auto-decoupage et ajout d'outils manuels pratiques

## Ce qui change

1. **Supprimer l'auto-decoupage** : Le panneau "Decouvpage automatique", le bouton toolbar, la fonction `autoSubdivide` dans geometry.ts, `generateRoads`, le type `AutoSubdivideOptions`, et `handleAutoSubdivide` dans le hook.

2. **Creer le premier lot automatiquement** : Quand l'utilisateur arrive sur l'etape designer et qu'il n'y a aucun lot, creer automatiquement un lot unique couvrant toute la parcelle mere (utilisant `parentVertices`). L'utilisateur le decoupe ensuite manuellement avec l'outil "Tracer ligne".

3. **Ajouter des outils pratiques manquants** :

| Outil | Description |
|-------|-------------|
| **Ajouter un lot vide** | Bouton "+" dans la toolbar pour creer un petit lot rectangulaire au centre, que l'utilisateur positionne ensuite |
| **Mesurer une distance** | Mode "regle" : clic sur deux points pour afficher la distance en metres sans tracer de ligne permanente |
| **Aligner les lots** | Bouton pour aligner horizontalement ou verticalement les aretes selectionnees de lots adjacents |
| **Repartir egalement** | Quand plusieurs lots sont selectionnes (Ctrl+clic), un bouton permet d'egaliser leurs surfaces en ajustant les limites communes |

4. **Ameliorer le message d'etat vide** : Remplacer "Utilisez l'auto-decoupage pour commencer" par un guide contextuel expliquant comment tracer une premiere ligne pour diviser la parcelle.

## Fichiers impactes

| Action | Fichier |
|--------|---------|
| Modifie | `StepLotDesigner.tsx` — Supprimer panneau auto-decoupage, bouton toolbar, props `onAutoSubdivide`. Ajouter boutons "Ajouter lot", "Mesurer", "Aligner", "Egaliser". Creer lot initial si aucun lot. |
| Modifie | `useSubdivisionForm.ts` — Supprimer `handleAutoSubdivide`, import `autoSubdivide`/`generateRoads`. Ajouter logique creation lot initial couvrant la parcelle. |
| Modifie | `types.ts` — Supprimer `AutoSubdivideOptions` |
| Modifie | `utils/geometry.ts` — Supprimer `autoSubdivide` et `generateRoads` |
| Modifie | `LotCanvas.tsx` — Ajouter mode `measure` (regle) : affiche distance entre 2 points cliques sans creer d'objet |

