# Carte des circonscriptions : données compactes et carte agrandie

## Résultat attendu
- Après sélection d’une circonscription foncière, la carte occupe environ 75 % de la hauteur de la colonne de gauche au lieu d’être partagée presque à égalité avec les données.
- Le bloc inférieur conserve les mêmes indicateurs et les mêmes réglages d’affichage, mais chaque donnée n’est plus enfermée dans une petite carte séparée.
- Les indicateurs sont présentés comme un tableau compact : libellés à gauche, valeurs alignées à droite, séparateurs fins et aucun fond individuel.
- Le nom de la zone sélectionnée reste visible en tête du tableau ; le bouton de fermeture reste disponible sur mobile.
- Si tous les indicateurs ne tiennent pas dans les 25 % disponibles, le bloc reste défilable sans réduire la carte.

## Répartition de l’espace
- Mobile : passage de 50 % carte / 50 % données à 75 % carte / 25 % données lorsqu’une zone est sélectionnée.
- Grand écran : passage d’environ 60 % carte / 40 % données à 75 % carte / 25 % données.
- Sans sélection, la carte continue d’occuper tout l’espace disponible comme aujourd’hui.

## Détails techniques
- `src/components/map/ui/MapKPICards.tsx` : remplacer la grille de cartes par une liste sémantique compacte à deux colonnes (libellé / valeur), tout en conservant `isChartVisible`, les intitulés administrables, les unités et les états sans valeur.
- Utiliser uniquement les couleurs et séparateurs sémantiques du thème ; retirer l’import `Card` devenu inutile.
- `src/components/DRCInteractiveMap.tsx` : ajuster les proportions des deux zones à 3/4 et 1/4 sur mobile et grand écran ; conserver le défilement de sécurité du panneau inférieur.
- Ne pas modifier les calculs, les sources de données, les filtres ni la bande d’information intégrée à la carte lors du survol ou de la sélection.
- Aucune modification de base de données ni du serveur.

## Vérification
- Contrôler les proportions et l’absence de chevauchement sur mobile et grand écran avec une circonscription sélectionnée.
- Vérifier les cas avec tous les indicateurs visibles, quelques indicateurs masqués et les moyennes indisponibles.
- Vérifier que le bouton de fermeture mobile reste utilisable et que le panneau inférieur défile si nécessaire.
- Lancer les tests existants, le contrôle TypeScript et confirmer une compilation sans erreur.
