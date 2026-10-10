# Nom de la circonscription directement sur la carte

## Résultat attendu
- Après sélection d’une circonscription foncière, son nom s’affiche à l’intérieur de sa forme sur la carte zoomée.
- Le bandeau portant actuellement « Circonscription foncière de … » en bas de la carte est supprimé afin de ne plus masquer la carte.
- Le bouton de retour reste disponible et le bloc compact de données situé sous la carte ne change pas.

## Affichage
- Le libellé est placé au centre géographique de la limite identifiée, en utilisant le même calcul de projection que la forme affichée.
- Si une circonscription est composée de plusieurs morceaux, le nom est placé sur le morceau principal afin d’éviter un libellé décentré entre plusieurs zones.
- Le texte reste lisible sur les différentes couleurs de circonscription grâce aux couleurs sémantiques du thème et à un contour discret.
- Le libellé ne capte aucun clic et ne gêne donc pas la sélection ni le retour.
- Si la limite de la circonscription n’est pas encore identifiée, aucun nom n’est placé artificiellement sur la carte ; le message existant sous la carte reste affiché.

## Détails techniques
- Modifier `src/components/map/LandDistrictMap.tsx` pour réutiliser le calcul de centroïde déjà partagé dans `src/lib/mapProjection.ts`.
- Déterminer la géométrie principale parmi les éléments correspondant à la circonscription sélectionnée, puis rendre son nom dans le SVG après les formes afin qu’il reste visible.
- Retirer uniquement le bandeau inférieur absolu devenu redondant ; conserver le zoom animé, la sélection clavier, le survol, la légende et `MapZoomBackButton`.
- Aucune modification des données, des filtres, du serveur ou de la base de données.

## Vérification
- Sélectionner une circonscription à limite simple puis une circonscription en plusieurs morceaux : le nom doit apparaître dans la zone sélectionnée.
- Vérifier que le nom suit correctement l’animation de zoom et ne déborde pas de manière incohérente sur mobile et grand écran.
- Vérifier le retour à la vue de toutes les circonscriptions, l’absence de l’ancien bandeau et le cas d’une limite non identifiée.
- Lancer les tests existants et confirmer une compilation sans erreur.
