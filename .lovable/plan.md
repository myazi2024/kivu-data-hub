# Afficher les circonscriptions foncières avec les couleurs de l’Accueil

## Résultat attendu
- Dans la vue « Circonscriptions foncières » de la Carte RDC, afficher les limites identifiées des circonscriptions foncières, et non une coloration présentée comme celle des villes, communes ou territoires sources.
- Utiliser pour chaque circonscription la même couleur d’identité stable que sur la carte de l’Accueil.
- Conserver en gris les zones dont la limite exacte n’est pas identifiée, sans inventer de frontière.
- Garder le nom de la circonscription, sa province, sa zone SU/SR et ses données au survol ou après sélection.

## Changements
1. **Couleurs partagées avec l’Accueil**
   - Utiliser directement la palette commune déjà produite pour les circonscriptions.
   - Ne plus remplacer ces couleurs par les paliers d’un indicateur Analytics lorsque la vue « Circonscriptions foncières » est active.

2. **Légende adaptée**
   - Ajouter la légende multicolore « Circonscriptions identifiées (X) » et la pastille grise « Découpage en cours », sur le modèle de l’Accueil.
   - Masquer dans cette vue la légende de paliers Analytics, puisqu’elle ne correspondrait plus aux couleurs affichées.

3. **Affichage et interactions**
   - Conserver le zoom, le survol, le clavier, le tactile, le retour et la synchronisation avec les filtres Analytics.
   - Vérifier que le titre, le détail sélectionné et les libellés parlent toujours de circonscriptions foncières, même lorsque leur limite provient d’une commune ou d’un territoire exact.

## Nettoyage
- Supprimer le calcul de couleur Analytics propre aux circonscriptions s’il n’a plus aucun consommateur.
- Ne pas modifier les couleurs Analytics des autres vues géographiques, notamment les provinces, communes, quartiers et territoires.

## Validation
- Tester une circonscription communale, une circonscription territoriale, une zone sans limite identifiée et un changement d’onglet Analytics.
- Vérifier la cohérence des couleurs entre l’Accueil et la Carte RDC, ainsi que la légende sur ordinateur et téléphone.
- Exécuter les tests cartographiques, la suite complète et le contrôle de compilation.
