# Rééquilibrer le menu « Actions » mobile

## Objectif
Rendre le menu moins comprimé tout en laissant la parcelle visible : environ un quart de l’écran au repos, puis jusqu’à la moitié uniquement lorsqu’une explication détaillée est ouverte.

## Design proposé
- Conserver une seule rangée de services avec défilement horizontal.
- Donner à chaque service une largeur d’environ deux anciennes vignettes, soit près des deux tiers de l’écran mobile : le service actif reste bien lisible et un aperçu du suivant indique naturellement qu’on peut faire défiler.
- Présenter chaque service dans une fiche épurée : icône et badge en tête, titre, courte explication sur deux lignes, puis les boutons « En savoir plus » et « Ouvrir ».
- Garder les couleurs et composants visuels existants, avec une hiérarchie plus nette, des séparateurs légers et des zones tactiles d’au moins 44 px.

## Comportement
1. À l’ouverture de « Actions », limiter le panneau à environ `28dvh` afin d’accueillir les fiches enrichies sans masquer la majorité de la carte.
2. « En savoir plus » ouvre une seule explication à la fois et porte le panneau à environ `50dvh` avec une transition douce.
3. Dans cet état, la fiche concernée s’agrandit verticalement ; son explication dispose de sa propre zone de défilement vertical pour que les boutons restent accessibles.
4. « Réduire » referme l’explication et ramène automatiquement le panneau à sa hauteur normale.
5. Faire défiler ou ouvrir un autre service referme proprement l’explication précédente si nécessaire.
6. Le bouton « Ouvrir » conserve les règles d’authentification et de disponibilité actuelles ; un service indisponible reste clairement identifié.
7. La version ordinateur reste inchangée.

## Détails techniques
- Faire remonter l’état « explication ouverte » du menu vers le panneau de la carte pour synchroniser sa hauteur et le décalage des contrôles Leaflet.
- Séparer la fiche mobile de l’action globale : les boutons « En savoir plus » et « Ouvrir » ont chacun leur interaction et leurs libellés accessibles.
- Respecter les mouvements réduits et empêcher les zones de défilement horizontale et verticale de déplacer la carte involontairement.

## Vérification
- Contrôler à 360 × 580 px les états fermé, normal et explication ouverte.
- Vérifier le défilement horizontal des neuf services, le défilement vertical de chaque explication, « Réduire », « Ouvrir » et les services indisponibles.
- Vérifier qu’aucun contrôle de carte n’est recouvert et que la présentation ordinateur ne change pas.
- Valider la compilation et les tests ciblés existants.
