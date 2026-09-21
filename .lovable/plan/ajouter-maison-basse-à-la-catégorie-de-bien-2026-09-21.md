# Ajouter « Maison basse » à la catégorie de bien

## Objectif

Dans le formulaire CCC (onglet Localisation, bloc Construction), la liste « Catégorie de bien » proposera une nouvelle valeur : **Maison basse**. Une maison basse est une habitation de plain-pied : la question « Nombre d'étages » ne s'applique donc pas et disparaît quand cette catégorie est choisie.

## Comportement attendu

- Nouvelle valeur « Maison basse » dans la liste, placée juste après « Maison ».
- Comme « Maison » et « Villa », elle est résidentielle : le type de construction se règle automatiquement sur « Résidentielle », et toutes les cascades suivantes (nature, matériaux, usage, standing) fonctionnent à l'identique.
- « Nombre d'étages » est masqué et enregistré comme rez-de-chaussée (0). Si l'utilisateur avait déjà saisi des étages avant de basculer sur « Maison basse », la valeur est effacée.
- « Hauteur » reste saisissable, avec le minimum du rez-de-chaussée (3 m), cohérent avec la règle actuelle 3 m × (étages + 1).
- Même traitement dans le bloc « Autre construction » (constructions multiples) : la catégorie y est aussi disponible et masque les étages.
- Accord grammatical des libellés de location : « Cette maison basse est-elle mise en location ? » comme pour Maison/Villa.
- Récapitulatif, fiche cadastrale et espace admin affichent « Maison basse » sans mention d'étages.

## Détails techniques

Front-end
- `src/hooks/useCCCFormState.ts` : ajouter `'Maison basse'` à `PROPERTY_CATEGORY_OPTIONS` et `['Résidentielle']` dans `CATEGORY_TO_CONSTRUCTION_TYPES`.
- `src/components/cadastral/AdditionalConstructionBlock.tsx` : même ajout dans `PROPERTY_CATEGORY_OPTIONS_NO_TERRAIN` et sa table de mapping ; masquer le champ étages et forcer 0 ; auto-hauteur basée sur 0 étage.
- Nouveau prédicat partagé `isSingleStoreyCategory()` dans `src/utils/cccPredicates.ts` (test sur « Maison basse »), utilisé par les deux blocs pour éviter la duplication.
- `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx` : `showFloors` devient faux pour cette catégorie ; effet de nettoyage qui remet `floorNumber` à `'0'` lorsqu'on sélectionne « Maison basse » ; `BuildingHeightField` reçoit `floorCount={0}`.
- Accord des libellés : étendre le test `=== 'Maison' || === 'Villa'` (ConstructionSection l. 465, AdditionalConstructionBlock l. 589) pour couvrir « Maison basse ».
- `src/utils/rentalStatus.ts` : vérifier que la catégorie n'est ni « location unique » ni « non résidentielle » — comportement identique à « Maison », aucun changement requis.
- Les autres dialogues qui répliquent la liste (`RealEstateExpertiseRequestDialog.tsx`, `LandTitleRequestDialog.tsx`) reçoivent la même valeur pour rester cohérents avec les parcelles issues du CCC.

Back-end
- Aucune migration de schéma nécessaire : `property_category` est une colonne texte libre sur `cadastral_contributions` et `cadastral_parcels`, sans contrainte de valeurs (vérifié en base).
- `src/utils/constructionTypeNormalizer.ts` : mapper « Maison basse » vers le type « Résidentielle » pour les analytics et les vues historiques.
- Vérifier que le trigger de synchronisation contribution → parcelle recopie bien `property_category` et `floor_number` (0) sans traitement particulier.

Vérification
- Typecheck + suite Vitest (tests de cascade construction et de validation) ; ajout d'un cas de test « Maison basse » → type Résidentielle, étages masqués, hauteur minimale 3 m.
