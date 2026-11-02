# Accueil mobile + Limites de la parcelle

## 1. Accueil (mobile uniquement)
- Placer les boutons « Cadastre numérique » et « Données foncières » côte à côte (2 colonnes), libellés courts « Cadastre » et « Données » sur mobile ; libellés complets inchangés sur desktop.
- L'espace libéré revient à la carte des circonscriptions foncières (hauteur agrandie), en gardant l'accueil sans défilement (vérifié à 360×592 et 393×495).

## 2. Formulaire CCC — Limites et Entrées, nature de la limite
Choix proposés pour chaque côté :
- Mur — le côté borde une route
- Mur mitoyen — partagé avec un voisin, pas de route
- Limite (sans mur) — le côté borde une route
- **Limite (sans mur) mitoyenne** (nouveau) — séparée du voisin par de simples bornes, pas de route, aucun champ supplémentaire

Comportement :
- La question « Une route borde-t-elle ce côté ? » est supprimée.
- « Mur » ou « Limite (sans mur) » : le bloc « Informations sur la route » s'ouvre automatiquement et ses champs deviennent obligatoires.
- Une petite icône d'aide (popover) à côté de « Informations sur la route » affiche :
  > « Vous avez choisi « Mur » ou « Limite (sans mur) » : cela signifie que ce côté de la parcelle donne sur une route. Merci de renseigner les informations de cette route. Si ce côté touche plutôt une parcelle voisine, choisissez « Mur mitoyen » ou « Limite (sans mur) mitoyenne ». »
- Passer à un choix mitoyen efface les informations de route déjà saisies pour ce côté.

## 3. Affichages et données
- Nouveau libellé repris dans le récapitulatif, le détail admin, la fiche cadastrale et les statistiques.
- Anciens brouillons : un côté « Mur »/« Limite » précédemment marqué « pas de route » sera rouvert avec la route à compléter (ou à convertir en mitoyen).
- Vérification côté serveur de la valeur `limite_mitoyenne` si une contrainte existe sur ce champ.

## Détails techniques
- `HeroSection.tsx` : grille `grid-cols-2` sous `sm`, `<span className="sm:hidden">` pour les libellés courts ; ajuster la hauteur de la carte.
- `ParcelSidesDimensionsPanel.tsx` : `BoundaryKind` + `'limite_mitoyenne'` ; `handleBoundaryKindChange` force `hasRoad: true, borderType: 'route'` pour mur/limite, `hasRoad: false` + `ROAD_FIELDS_RESET` pour les mitoyens ; suppression de `handleRoadAnswer` et du radiogroup ; `canConfirm` exige la route pour mur/limite ; Popover shadcn sur l'en-tête route.
- `boundaryKindLabel`, ReviewTab, CCCDetailsDialog, LocationSection, analytics (`boundaryKindData`) : nouveau libellé.
- Tests : mise à jour de `constructionAnalytics.test.ts` / `ownerOccupiedUnit.test.ts` et test de la règle « mur/limite ⇒ route requise, mitoyen ⇒ pas de route ».
