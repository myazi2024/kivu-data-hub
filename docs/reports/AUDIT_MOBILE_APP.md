# Audit mobile de l’application BIC

## Périmètre contrôlé

- Pages publiques sur des largeurs de 320, 360, 390 et 768 pixels.
- Carte cadastrale, cartes territoriales, formulaire CCC et services associés.
- Espaces utilisateur, revendeur, ressources humaines et administration par revue du code.
- Fenêtres, onglets, tableaux, actions fixes, cibles tactiles et chargements cartographiques.

## Corrections réalisées

- Prise en charge des encoches et barres système des téléphones.
- Fenêtres contraintes à la hauteur visible, avec défilement interne.
- Boutons et contrôles principaux portés à une cible tactile mobile d’au moins 44 pixels.
- Onglets nombreux rendus horizontalement défilables, notamment dans le CCC et l’administration.
- Actions des formulaires CCC protégées de la barre système inférieure.
- Correction des débordements sur les pages CCC et Codes de remise.
- Largeur de l’espace admin libérée sur téléphone et tablette.
- Tableaux longs conservés avec défilement horizontal explicite.
- Formulaires de configuration longs passés en une colonne sur téléphone.
- Carte et contrôles cartographiques adaptés à la hauteur dynamique et aux gestes tactiles.
- Requêtes cartographiques publiques bornées et champs chargés limités au nécessaire.
- Déduplication des chargements GeoJSON simultanés et mise à jour locale du catalogue en temps réel.

## Vérifications

- 48 combinaisons de pages publiques et de tailles d’écran : aucun débordement horizontal et aucune erreur JavaScript détectés.
- Contrôle TypeScript réussi.
- 200 tests automatisés réussis.
- Compilation de l’aperçu réussie.

## Limite de validation

Les pages nécessitant une connexion ont été vérifiées par analyse du code et tests automatisés. Leur contrôle visuel authentifié de bout en bout n’est pas disponible avec la connexion Supabase externe de cet environnement.