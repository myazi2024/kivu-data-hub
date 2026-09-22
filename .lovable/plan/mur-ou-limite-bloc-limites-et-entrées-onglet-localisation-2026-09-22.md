# « Mur ou Limite » — bloc Limites et Entrées (onglet Localisation)

## Objectif

Aujourd'hui, activer le segment « Mur » sur un côté ouvre directement le bloc « Informations sur le mur » avec un matériau obligatoire. Or un côté peut simplement être une limite de parcelle sans aucun mur : cette situation doit pouvoir être déclarée.

Le segment « Mur » devient donc un choix à deux valeurs — **Mur** ou **Limite** — avec des dépendances distinctes.

## Comportement proposé

### 1. Choix « Mur ou Limite »

- Le contrôle segmenté reste identique (deux pastilles cumulables : côté gauche limite/mur, côté droit route). Le libellé du segment gauche devient **« Limite »**.
- Quand ce segment est activé, une liste déroulante **« Mur ou Limite \* »** s'affiche en tête du bloc, avec deux valeurs :
  - **Mur** — le côté est fermé par un mur ;
  - **Limite** — simple limite de parcelle, sans mur.
- Par défaut, aucune valeur n'est présélectionnée : l'utilisateur doit choisir.

### 2. Dépendances

- **Mur** : le bloc actuel s'affiche — matériau du mur (obligatoire) et hauteur du mur (facultative). Le bouton « Ajouter » exige le matériau.
- **Limite** : aucun champ supplémentaire ; les valeurs matériau et hauteur éventuellement saisies sont effacées. Le bouton « Ajouter » devient immédiatement disponible (le côté route, s'il est aussi activé, garde ses propres exigences).
- Repasser de « Limite » à « Mur » réaffiche les champs vides.

### 3. Affichage

- Icône et couleur : mur = ambre (inchangé) ; limite = neutre (gris) avec une icône de tracé de limite.
- Résumé d'un côté confirmé : « Mur : Brique · Hauteur : 2 m » ou simplement « Limite de parcelle (sans mur) ».
- Compteurs d'en-tête : le badge ambre compte les murs ; un badge neutre compte les limites sans mur.
- Récapitulatif du formulaire, fiche cadastrale, fiche admin CCC et panneau de la carte cadastrale affichent la même distinction.

### 4. Notifications intelligentes

- Message d'accueil (côtés vierges) reformulé : expliquer qu'un côté peut porter une **Limite** (mur ou simple limite), une **Route**, ou les deux, et qu'il faut cocher **Entrée** sur le côté d'accès.
- Aide contextuelle à la sélection « Limite » : « Aucune information supplémentaire n'est requise pour une simple limite — cliquez sur Ajouter pour valider ce côté. »
- Aide contextuelle à la sélection « Mur » : « Précisez le matériau ; la hauteur est facultative mais utile pour l'évaluation. »
- Rappel de progression : tant que tous les côtés ne sont pas renseignés, afficher « X côté(s) sur N renseigné(s) » avec la liste des côtés restants.
- Rappel d'entrée : si au moins un côté est confirmé et qu'aucune case « Entrée » n'est cochée, afficher un avertissement non bloquant « Indiquez le côté par lequel on accède à la parcelle ».
- L'alerte « Servitude de passage » reste déclenchée par l'absence de route sur tous les côtés ; son texte est reformulé pour parler de « limites (murs ou limites simples) » au lieu de « murs mitoyens ».

## Détails techniques

- `src/components/cadastral/ParcelSidesDimensionsPanel.tsx` :
  - `RoadSideInfo` reçoit `boundaryKind?: 'mur' | 'limite'` ; `hasWall` conserve son sens « le segment limite est activé ». Repli de lecture : un enregistrement existant avec `wallMaterial` ou `borderType === 'mur_mitoyen'` est considéré `boundaryKind: 'mur'`.
  - Nouveau helper exporté `sideBoundaryKind(side)` à côté de `sideHasWall` / `sideHasRoad`.
  - `canConfirm` : si le segment limite est actif, exiger `boundaryKind` défini, et `wallMaterial` uniquement si `boundaryKind === 'mur'`.
  - Changer de `boundaryKind` vers `limite` applique `WALL_FIELDS_RESET`.
  - `BorderTypeToggle` : libellé « Limite » sur le segment gauche, icône conservée.
- Propagation de l'affichage : `ccc-tabs/ReviewTab.tsx`, `cadastral-document/sections/LocationSection.tsx` (colonne « Mur » → « Limite / Mur »), `admin/ccc/CCCDetailsDialog.tsx`, `pages/CadastralMap.tsx`, `RoadBorderingSidesPanel.tsx` (type partagé).
- Aucune migration : `road_sides` est un jsonb ; `boundaryKind` y est enregistré automatiquement et la vue publique `cadastral_parcels_public` expose déjà la colonne.
- Vérification : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
