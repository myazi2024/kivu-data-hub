# Refonte du bouton slide « Mur mitoyen / Route » — Limites et Entrées

## Objectif
Remplacer l'actuel interrupteur `Switch` (qui n'affiche qu'un seul libellé à la fois et ne permet de fait que le mode « Route ») par un **contrôle segmenté coulissant** à deux options visibles — **Mur** et **Route** — calqué sur le style de `CadastralSearchModeToggle` (pastille coulissante, `role="radiogroup"`). Rendre l'option « Mur » réellement fonctionnelle. Abréger les libellés pour gagner de l'espace.

## Constat actuel (vérifié)
- `src/components/cadastral/ParcelSidesDimensionsPanel.tsx`, lignes 320-343 : un `Switch` `checked={isEditingThis}` avec un libellé `{isEditingThis ? 'Route' : 'Mur mitoyen'}`.
  - Cocher → `borderType: 'route'` + ouverture du formulaire route. Décocher → suppression du côté.
  - **Aucun chemin ne produit `borderType: 'mur_mitoyen'`** : `handleBorderTypeChange` existe mais n'est appelé nulle part ; le formulaire d'édition (397-474) ne contient que les champs route ; `canConfirm` retourne toujours `false` pour un mur. Le badge `wallCount` et la détection « servitude de passage » ne peuvent donc jamais se déclencher.
- Libellé « Entrée de la parcelle » (desktop) / « Entrée » (mobile), ligne 317.
- Texte d'aide (ligne 242) mentionne « Mur mitoyen » et « Entrée ».

## Refonte proposée

### 1. Contrôle segmenté coulissant [Mur | Route]
Remplacer le bloc `Switch` + libellé par un mini contrôle segmenté réutilisable (inline dans le fichier, ou petit composant local) reprenant le motif de `CadastralSearchModeToggle` :
- Conteneur `role="radiogroup"`, `aria-label="Type de limite"`, fond `bg-muted/60`, bordure arrondie pleine.
- **Pastille coulissante** (`pointer-events-none`, transition `transform 0.28s cubic-bezier(0.34,1.4,0.64,1)`) qui glisse entre les deux options.
- Deux boutons `role="radio"` : **Mur** (icône `BrickWall`) et **Route** (icône `Route`).
- **Coloration sémantique** cohérente avec le reste du panneau (vert = route, ambre = mur) : pastille verte quand Route actif, ambre quand Mur actif. Texte foncé sur la pastille.
- Taille compacte (hauteur ~28-32px) adaptée au panneau de 360px ; cibles tactiles raisonnables.
- **État « non encore choisi »** : pour un côté vierge (`borderType` indéfini), aucune pastille n'est affichée (les deux segments restent muets). Dès qu'un segment est cliqué, la pastille apparaît sur l'option choisie.

### 2. Comportement
- Côté vierge : cliquer **Mur** → `handleStartEdit` avec `borderType: 'mur_mitoyen'` ; cliquer **Route** → `borderType: 'route'`. Le formulaire d'édition s'ouvre.
- Côté en édition : cliquer l'autre segment → `handleBorderTypeChange` (bascule + reset des champs de l'autre type), pastille glisse.
- La suppression d'un côté reste via le bouton **Annuler** existant dans le formulaire (l'interrupteur n'a plus de rôle « off »).
- `handleStartEdit` : valoriser `borderType` selon le segment cliqué plutôt que toujours `'route'`.

### 3. Formulaire d'édition « Mur mitoyen »
Ajouter, parallèlement au bloc route existant, un bloc affiché quand `borderType === 'mur_mitoyen'` et édition ouverte :
- En-tête « Informations sur le mur » (icône `BrickWall`, couleur ambre).
- **Matériau du mur** (`Select`, `defaultWallMaterials`, obligatoire).
- **Hauteur du mur** (`Input number`, m, optionnelle).
- Mêmes boutons **Ajouter** / **Annuler** (réutiliser la logique `handleConfirmSide`).
- Mettre à jour `canConfirm` : pour `mur_mitoyen`, exiger `wallMaterial` (la hauteur reste facultative). `handleConfirmSide` valide déjà `wallMaterial` pour le mur.

### 4. Abréviations
- « Mur mitoyen » → **Mur** (libellé du segment, texte d'aide, badges/résumés éventuels).
- « Entrée de la parcelle » → **Entrée** (desktop comme mobile).
- Mettre à jour le texte d'aide (ligne 242) pour utiliser « Mur » et « Entrée ».

## Détails techniques
- Fichier unique : `src/components/cadastral/ParcelSidesDimensionsPanel.tsx`.
- Aucune migration / base de données : `borderType`, `wallHeight`, `wallMaterial` existent déjà dans `RoadSideInfo` et sont persistés via le jsonb `road_sides` (`useCCCFormState` → `useCadastralContribution`).
- Pas de modification de `RoadBorderingSidesPanel.tsx` (panneau carte, sans notion Mur/Route).
- Accessibilité : `role="radiogroup"`/`radio`, `aria-checked`, `aria-label` par option, navigation clavier native via boutons.

## Hors périmètre
- Ajout des champs revêtement/caniveau dans ce panneau CCC (déjà gérés dans `RoadBorderingSidesPanel` côté carte).
- Affichage du mur dans la fiche cadastrale en lecture seule (existant : badge `wallCount` + détection servitude).
