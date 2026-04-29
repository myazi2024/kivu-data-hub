## Problème

Dans `RealEstateExpertiseRequestDialog.tsx` (onglet Documents → "Photos de la construction"), le seul bouton disponible utilise un `<input>` avec l'attribut `capture="environment"`. Sur mobile, cela force l'ouverture de l'appareil photo et empêche l'utilisateur de choisir des images déjà prises dans sa galerie.

## Correction

Remplacer le bouton unique par deux boutons côte à côte avec deux inputs séparés :

1. **"Prendre une photo"** — input avec `capture="environment"` (ouvre la caméra)
2. **"Choisir depuis la galerie"** — input sans `capture` (ouvre la galerie / explorateur de fichiers)

Les deux alimentent la même liste `constructionImages` via `handleConstructionImageSelect`.

### Détails techniques

Fichier modifié : `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx` (lignes ~2035-2053)

- Ajouter un second `useRef` (ex. `constructionGalleryInputRef`) à côté de `constructionImagesInputRef`.
- Remplacer le bloc input + bouton actuels par :
  - 2 inputs cachés `multiple accept="image/*"` (un avec `capture="environment"`, l'autre sans).
  - Un conteneur `flex gap-2` avec 2 boutons `variant="outline"` :
    - `Camera` icon → "Prendre une photo"
    - `Image` icon → "Depuis la galerie"
- Layout responsive : `grid grid-cols-2 gap-2` pour rester lisible sur viewport 360px.
- Conserver le rendu existant de la grille de previews.

Aucun changement nécessaire au state, aux handlers, ou à la logique de validation/soumission.

## Vérification

Pas de migration, pas d'edge function. Vérification visuelle : sur mobile, le bouton "Depuis la galerie" doit ouvrir le sélecteur d'images standard (et non l'appareil photo).
