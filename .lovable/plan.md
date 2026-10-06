# Ajouter « Mur mitoyen » — Limite de la parcelle (Limites et Entrées)

## Comportement

- La liste « Limite de la parcelle » propose trois choix : **Mur**, **Mur mitoyen**, **Limite (sans mur)**.
- **Mur mitoyen** affiche les mêmes champs que « Mur » : matériau (obligatoire) et hauteur (facultative). Le bouton « Ajouter » exige le matériau.
- **Mur mitoyen exclut la route** : un mur partagé avec la parcelle voisine ne peut pas border une route.
  - En choisissant « Mur mitoyen », la route est désactivée sur ce côté et ses informations sont effacées.
  - La pastille « Route » de ce côté est grisée, avec le message « Route non applicable : ce côté est un mur mitoyen ».
  - Changer pour « Mur » ou « Limite » permet à nouveau d'activer la route.
- Affichage : couleur ambre et icône mur comme « Mur » ; résumé « Mur mitoyen : Brique · Hauteur : 2 m ». Le compteur des murs inclut les murs mitoyens.
- Le récapitulatif, la fiche cadastrale, la fiche admin CCC et la carte cadastrale affichent « Mur mitoyen ».
- Message d'aide à la sélection : « Mur partagé avec la parcelle voisine — précisez le matériau. Ce côté ne peut pas border une route. »
- L'alerte « Servitude de passage » (aucune route sur aucun côté) tient compte des murs mitoyens.

## Détails techniques

- `RoadBorderingSidesPanel.tsx` et `ParcelSidesDimensionsPanel.tsx` : `boundaryKind` devient `'mur' | 'mur_mitoyen' | 'limite'`. Helper `isWallKind(kind)` (mur ou mur mitoyen) utilisé pour les champs, `canConfirm` et `wallCount`.
- `handleBoundaryKindChange('mur_mitoyen')` : applique `hasRoad: false`, `borderType: 'mur_mitoyen'` et `ROAD_FIELDS_RESET`. `toggleBorderType(..., 'route')` est ignoré si le type est mur mitoyen ; `BorderTypeToggle` reçoit `roadDisabled`.
- `canConfirm` : refuse un côté qui combine mur mitoyen et route.
- Affichage : `ccc-tabs/ReviewTab.tsx`, `cadastral-document/sections/LocationSection.tsx`, `admin/ccc/CCCDetailsDialog.tsx`, `pages/CadastralMap.tsx`, `ParcelMapPreview.tsx` (`boundaryKind` conservé).
- Serveur : nouvelle migration ajoutant à `validate_contribution_completeness` le refus d'un élément `road_sides` où `boundaryKind = 'mur_mitoyen'` et route déclarée (`hasRoad` vrai), ainsi que l'exigence du `wallMaterial` pour `mur` et `mur_mitoyen` sur les côtés confirmés. `road_sides` est en jsonb : aucun changement de colonne.
- `getParcelRoadSides` (carte) ignore déjà les côtés sans route : un mur mitoyen n'y est donc jamais annoté comme route.
- Vérification : typecheck, tests existants, plus un test unitaire pour la règle mur mitoyen / route.
