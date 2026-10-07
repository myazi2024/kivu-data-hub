# Compacter le menu « Actions » de la carte cadastrale sur mobile

## Objectif
Limiter le menu ouvert à environ un quart de la hauteur visible du téléphone afin que la parcelle reste largement visible et manipulable sur la carte.

## Constat confirmé
- Le panneau de parcelle peut actuellement monter jusqu’à 82 % de la hauteur de l’écran lorsque « Actions » est ouvert.
- Les neuf services sont affichés sous forme de grandes fiches verticales avec icône, titre, description, bouton « Ouvrir » et texte détaillé dépliable.
- Cette présentation explique la place excessive occupée sur mobile ; la version ordinateur peut rester détaillée.

## Modifications prévues
1. Créer une présentation mobile dédiée sous forme de bande horizontale compacte :
   - une seule rangée de services défilable latéralement ;
   - icône, intitulé court et badge conservés ;
   - toute la vignette ouvre le service ;
   - état indisponible clairement différencié et toujours accessible aux lecteurs d’écran.
2. Masquer sur téléphone les descriptions longues et le bouton redondant « Ouvrir » ; conserver la présentation détaillée actuelle sur ordinateur.
3. Limiter l’ensemble du panneau de parcelle, lorsqu’« Actions » est ouvert sur mobile, à environ `25dvh`, zones de sécurité comprises.
4. Compacter l’en-tête de la parcelle et la rangée « Données / Fermer / WhatsApp » dans cet état, tout en conservant des zones tactiles d’au moins 44 px.
5. Repositionner les contrôles de carte selon cette nouvelle hauteur afin qu’ils ne soient ni cachés ni inutilement repoussés vers le haut.
6. Préserver sans changement les neuf services, leur ordre administrable, leurs badges, leurs règles d’authentification et leurs conditions d’accès liées au titre foncier.

## Vérification
- Contrôler à 360 px de large que le panneau ouvert reste proche d’un quart de l’écran et que la parcelle demeure visible.
- Vérifier le défilement horizontal, l’ouverture de chaque service, les états indisponibles, la fermeture du menu et l’absence de chevauchement avec les contrôles de carte.
- Vérifier aussi la présentation ordinateur, le contrôle des types, les tests ciblés et la compilation finale.
